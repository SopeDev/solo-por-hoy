import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { BroadcastKind } from "@/generated/prisma/enums";
import { db } from "@/db/client";
import { cleanStreak, dayReport, displayName, groupStreak, isMilestone, reportMessage } from "./check-ins";
import { addDays, checkInDay, dateOfDay, dayOfDate, localDay, type DayKey } from "./days";
import { getAppTimeZone } from "./env";
import { promptPayload, sendPush } from "./push";
import { USER_NAME_FIELDS } from "./queries";

const HOUR = 60 * 60;

/** Records today's run of a broadcast; false when it already ran, so a repeated cron call sends nothing. */
async function claimBroadcast(kind: BroadcastKind, day: DayKey) {
  try {
    await db.broadcast.create({ data: { kind, day: dateOfDay(day) } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
    throw error;
  }
}

/** Evening: asks everyone who hasn't answered for today yet. */
export async function sendNightlyPrompts(now: Date) {
  const day = checkInDay(now, getAppTimeZone());
  if (!(await claimBroadcast(BroadcastKind.NIGHTLY_PROMPT, day))) return { day, skipped: true };

  const pending = await db.user.findMany({
    where: { pushSubscriptions: { some: {} }, checkIns: { none: { day: dateOfDay(day) } } },
    select: { id: true },
  });
  // Kept until the morning, so a phone that was off still gets asked while the day can be answered.
  const result = await sendPush(
    pending.map((user) => user.id),
    promptPayload(day),
    { ttl: 10 * HOUR, topic: "prompt" },
  );
  return { day, ...result };
}

/** Morning: tells each group how yesterday went for everyone in it. */
export async function sendMorningReports(now: Date) {
  const timeZone = getAppTimeZone();
  const day = addDays(localDay(now, timeZone), -1);
  if (!(await claimBroadcast(BroadcastKind.MORNING_REPORT, day))) return { day, skipped: true };

  const groups = await db.group.findMany({
    include: { memberships: { include: { user: { select: { id: true, ...USER_NAME_FIELDS } } }, orderBy: { joinedAt: "asc" } } },
  });
  // Everyone's history up to yesterday, for yesterday's answers and the streaks it completed.
  const checkIns = await db.checkIn.findMany({ where: { day: { lte: dateOfDay(day) } }, select: { userId: true, day: true, relapsed: true } });
  const history = new Map<string, Map<DayKey, boolean>>();
  for (const checkIn of checkIns) {
    if (!history.has(checkIn.userId)) history.set(checkIn.userId, new Map());
    history.get(checkIn.userId)!.set(dayOfDate(checkIn.day), checkIn.relapsed);
  }
  const answerOf = (userId: string) => history.get(userId)?.get(day);

  let sent = 0;
  let failed = 0;
  for (const group of groups) {
    // Someone who joined today wasn't part of yesterday.
    const members = group.memberships.filter((membership) => checkInDay(membership.joinedAt, timeZone) <= day);
    if (members.length === 0) continue;

    const report = dayReport(members.map((membership) => ({ name: displayName(membership.user), answer: answerOf(membership.userId) })));
    const milestones = members
      .filter((membership) => answerOf(membership.userId) === false)
      .map((membership) => ({ name: displayName(membership.user), streak: cleanStreak(history.get(membership.userId)!, day) }))
      .filter((member) => isMilestone(member.streak));
    const streak = groupStreak(
      members.map((membership) => ({ joinedDay: checkInDay(membership.joinedAt, timeZone), answers: history.get(membership.userId) ?? new Map() })),
      day,
    );
    const result = await sendPush(
      members.map((membership) => membership.userId),
      { type: "report", title: `Ayer en ${group.name}`, body: reportMessage(report, { milestones, groupStreak: members.length > 1 ? streak : 0 }) },
      { ttl: 12 * HOUR, topic: "report" },
    );
    sent += result.sent;
    failed += result.failed;
  }
  return { day, sent, failed };
}
