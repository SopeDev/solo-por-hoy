"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { requireActionUserId } from "@/lib/auth-user";
import { newInviteCode } from "@/lib/invite-code";
import { getMembership } from "@/lib/queries";

const groupName = z.string().trim().min(1).max(40);

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

export async function joinGroup(formData: FormData) {
  const userId = await requireActionUserId();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const group = await db.group.findUnique({ where: { inviteCode: code } });
  if (!group) redirect(`/unirse/${encodeURIComponent(code)}`);

  // Joining moves the person here from any other group.
  const current = await getMembership(userId);
  if (current && current.groupId !== group.id) await leaveCurrentGroup(userId);
  await db.membership.upsert({ where: { groupId_userId: { groupId: group.id, userId } }, create: { groupId: group.id, userId }, update: {} });
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
