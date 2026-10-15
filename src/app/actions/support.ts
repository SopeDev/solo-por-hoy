"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { requireActionUserId } from "@/lib/auth-user";
import { cheerMessage, displayName, statusOf } from "@/lib/check-ins";
import { addDays, checkInDay, dateOfDay } from "@/lib/days";
import { getAppTimeZone } from "@/lib/env";
import { promptPayload, sendPush } from "@/lib/push";
import { getCheckIn, getMembership, isNightlyPromptSent, isYesterdayOpen, USER_NAME_FIELDS } from "@/lib/queries";

const HOUR = 60 * 60;
const SOS_COOLDOWN_MS = 30 * 60 * 1000;

type Result = { ok: true } | { ok: false; reason: "limit" | "invalid" };

async function sender(userId: string) {
  const [user, membership] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: USER_NAME_FIELDS }),
    getMembership(userId),
  ]);
  return { name: displayName(user), membership };
}

/** Someone in the same group as the sender, other than the sender. */
async function isGroupmate(groupId: string, userId: string, toUserId: string) {
  if (toUserId === userId) return false;
  return Boolean(await db.membership.findUnique({ where: { groupId_userId: { groupId, userId: toUserId } }, select: { id: true } }));
}

/** "Necesito apoyo": tells everyone else in the group right away. At most once every half hour. */
export async function sendSos(): Promise<Result> {
  const userId = await requireActionUserId();
  const { name, membership } = await sender(userId);
  if (!membership) return { ok: false, reason: "invalid" };

  const recent = await db.signal.findFirst({ where: { fromUserId: userId, kind: "SOS", createdAt: { gte: new Date(Date.now() - SOS_COOLDOWN_MS) } } });
  if (recent) return { ok: false, reason: "limit" };

  const day = checkInDay(new Date(), getAppTimeZone());
  await db.signal.create({ data: { kind: "SOS", fromUserId: userId, day: dateOfDay(day) } });
  const others = await db.membership.findMany({ where: { groupId: membership.groupId, userId: { not: userId } }, select: { userId: true } });
  await sendPush(
    others.map((member) => member.userId),
    { type: "message", title: `${name} necesita apoyo ahora 🙏`, body: "Está pasando un momento difícil. Escríbele o llámale.", tag: `sos-${userId}` },
    // Only useful now: not worth delivering hours late.
    { ttl: HOUR, topic: "sos" },
  );
  return { ok: true };
}

/** A one-tap message to someone in the group, fitted to how their yesterday went. Once a day per person. */
export async function sendCheer(toUserId: string): Promise<Result> {
  const userId = await requireActionUserId();
  const { name, membership } = await sender(userId);
  if (!membership || !(await isGroupmate(membership.groupId, userId, toUserId))) return { ok: false, reason: "invalid" };

  const today = checkInDay(new Date(), getAppTimeZone());
  const day = dateOfDay(today);
  if (await db.signal.findFirst({ where: { fromUserId: userId, toUserId, kind: "CHEER", day } })) return { ok: false, reason: "limit" };

  // Decided here from their answer, not by the sender's screen, which may be out of date.
  const [yesterday, yesterdayOpen] = await Promise.all([getCheckIn(toUserId, addDays(today, -1)), isYesterdayOpen(today)]);
  const message = cheerMessage(name, statusOf(yesterday?.relapsed), yesterdayOpen);

  await db.signal.create({ data: { kind: "CHEER", fromUserId: userId, toUserId, day } });
  await sendPush([toUserId], { type: "message", ...message, tag: `cheer-${userId}` }, { ttl: 12 * HOUR, topic: "cheer" });
  revalidatePath("/");
  return { ok: true };
}

/**
 * Reminds someone who hasn't answered today, with the question's answer buttons. Only after tonight's question went
 * out, and once a day per person.
 */
export async function sendNudge(toUserId: string): Promise<Result> {
  const userId = await requireActionUserId();
  const { name, membership } = await sender(userId);
  if (!membership || !(await isGroupmate(membership.groupId, userId, toUserId))) return { ok: false, reason: "invalid" };

  const today = checkInDay(new Date(), getAppTimeZone());
  const day = dateOfDay(today);
  const [answered, already, asked] = await Promise.all([
    db.checkIn.findUnique({ where: { userId_day: { userId: toUserId, day } }, select: { id: true } }),
    db.signal.findFirst({ where: { fromUserId: userId, toUserId, kind: "NUDGE", day } }),
    isNightlyPromptSent(today),
  ]);
  if (answered || !asked) return { ok: false, reason: "invalid" };
  if (already) return { ok: false, reason: "limit" };

  await db.signal.create({ data: { kind: "NUDGE", fromUserId: userId, toUserId, day } });
  await sendPush([toUserId], promptPayload(today, name), { ttl: 10 * HOUR, topic: "prompt" });
  revalidatePath("/");
  return { ok: true };
}
