"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { requireActionUserId } from "@/lib/auth-user";
import { newInviteCode } from "@/lib/invite-code";
import { addDays, checkInDay, dateOfDay, isDayKey } from "@/lib/days";
import { getAppTimeZone } from "@/lib/env";
import { CORRECTION_DAYS, getMembership, saveCorrection } from "@/lib/queries";

const groupName = z.string().trim().min(1).max(40);
const role = z.enum(["PARTICIPANT", "SUPPORTER"]);

export async function createGroup(formData: FormData) {
  const userId = await requireActionUserId();
  const name = groupName.safeParse(formData.get("name"));
  if (!name.success) redirect("/");

  // For now a person is in one group; creating one leaves any other.
  await leaveCurrentGroup(userId);
  await db.group.create({
    data: { name: name.data, inviteCode: newInviteCode(), createdById: userId, memberships: { create: { userId } } },
  });
  revalidatePath("/");
  redirect("/");
}

/** Joins by invite code, either doing the challenge or as a supporter ("acompañante"). */
export async function joinGroup(formData: FormData) {
  const userId = await requireActionUserId();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const joinAs = role.catch("PARTICIPANT").parse(formData.get("role"));
  const group = await db.group.findUnique({ where: { inviteCode: code } });
  if (!group) redirect(`/unirse/${encodeURIComponent(code)}`);

  // Joining moves the person here from any other group.
  const current = await getMembership(userId);
  if (current && current.groupId !== group.id) await leaveCurrentGroup(userId);
  await db.membership.upsert({ where: { groupId_userId: { groupId: group.id, userId } }, create: { groupId: group.id, userId, role: joinAs }, update: {} });
  revalidatePath("/");
  redirect("/");
}

/**
 * Leaves the person's group. If they created it, the longest-standing member takes over; the last one out deletes
 * it.
 */
async function leaveCurrentGroup(userId: string) {
  const membership = await getMembership(userId);
  if (!membership) return;
  await db.$transaction(async (tx) => {
    await tx.membership.deleteMany({ where: { userId } });
    const next = await tx.membership.findFirst({ where: { groupId: membership.groupId }, orderBy: { joinedAt: "asc" } });
    if (!next) await tx.group.delete({ where: { id: membership.groupId } });
    else if (membership.group.createdById === userId) await tx.group.update({ where: { id: membership.groupId }, data: { createdById: next.userId } });
  });
}

export async function leaveGroup() {
  const userId = await requireActionUserId();
  await leaveCurrentGroup(userId);
  revalidatePath("/");
  redirect("/");
}

/** The group's creator manages it. */
async function requireOwnGroup() {
  const userId = await requireActionUserId();
  const membership = await getMembership(userId);
  if (!membership || membership.group.createdById !== userId) throw new Error("Forbidden");
  return { userId, groupId: membership.groupId };
}

export async function renameGroup(formData: FormData) {
  const { groupId } = await requireOwnGroup();
  const name = groupName.safeParse(formData.get("name"));
  if (name.success) await db.group.update({ where: { id: groupId }, data: { name: name.data } });
  revalidatePath("/", "layout");
}

/** A new invite link; the old one stops working. */
export async function resetInviteCode() {
  const { groupId } = await requireOwnGroup();
  await db.group.update({ where: { id: groupId }, data: { inviteCode: newInviteCode() } });
  revalidatePath("/", "layout");
}

/** Removes someone and replaces the invite link, so the old one can't bring them back. */
export async function removeMember(memberId: string) {
  const { userId, groupId } = await requireOwnGroup();
  if (memberId === userId) return;
  await db.$transaction([
    db.membership.deleteMany({ where: { groupId, userId: memberId } }),
    db.group.update({ where: { id: groupId }, data: { inviteCode: newInviteCode() } }),
  ]);
  revalidatePath("/", "layout");
}

/**
 * Records or corrects someone's answer for a closed day, e.g. when they forgot to answer and said so. Only for days
 * since they joined and within the last 30; the answer is marked as corrected.
 */
export async function correctCheckIn(formData: FormData) {
  const { userId, groupId } = await requireOwnGroup();
  const memberId = String(formData.get("member") ?? "");
  const day = String(formData.get("day") ?? "");
  const answer = formData.get("answer");

  const today = checkInDay(new Date(), getAppTimeZone());
  const membership = await db.membership.findUnique({ where: { groupId_userId: { groupId, userId: memberId } } });
  const valid =
    membership &&
    membership.role === "PARTICIPANT" &&
    isDayKey(day) &&
    (answer === "clean" || answer === "relapsed") &&
    day < today &&
    day >= addDays(today, -CORRECTION_DAYS) &&
    day >= checkInDay(membership.joinedAt, getAppTimeZone());
  if (!valid) redirect("/ajustes?correccion=error");

  await saveCorrection(memberId, day, answer === "relapsed", userId);
  revalidatePath("/", "layout");
  redirect("/ajustes?correccion=ok");
}

/** Switches a membership's role. Becoming a participant starts counting today, so earlier days aren't "no answer". */
async function setRole(groupId: string, userId: string, next: "PARTICIPANT" | "SUPPORTER") {
  const membership = await db.membership.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (!membership || membership.role === next) return;
  const today = checkInDay(new Date(), getAppTimeZone());
  await db.membership.update({
    where: { id: membership.id },
    data: next === "PARTICIPANT" ? { role: next, participatingSince: dateOfDay(today) } : { role: next },
  });
}

/** Anyone can choose for themselves whether they do the challenge or accompany. */
export async function setMyRole(formData: FormData) {
  const userId = await requireActionUserId();
  const membership = await getMembership(userId);
  const next = role.safeParse(formData.get("role"));
  if (membership && next.success) await setRole(membership.groupId, userId, next.data);
  revalidatePath("/", "layout");
}

/** The group's creator can switch anyone's role. */
export async function setMemberRole(memberId: string, next: "PARTICIPANT" | "SUPPORTER") {
  const { groupId } = await requireOwnGroup();
  const parsed = role.safeParse(next);
  if (parsed.success) await setRole(groupId, memberId, parsed.data);
  revalidatePath("/", "layout");
}
