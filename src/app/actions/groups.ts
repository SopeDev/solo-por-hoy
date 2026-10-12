"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { requireActionUserId } from "@/lib/auth-user";
import { newInviteCode } from "@/lib/invite-code";

const groupName = z.string().trim().min(1).max(40);

export async function createGroup(formData: FormData) {
  const userId = await requireActionUserId();
  const name = groupName.safeParse(formData.get("name"));
  if (!name.success) redirect("/");

  // For now a person is in one group; creating one leaves any other.
  await db.$transaction([
    db.membership.deleteMany({ where: { userId } }),
    db.group.create({
      data: { name: name.data, inviteCode: newInviteCode(), createdById: userId, memberships: { create: { userId } } },
    }),
  ]);
  revalidatePath("/");
  redirect("/");
}

export async function joinGroup(formData: FormData) {
  const userId = await requireActionUserId();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const group = await db.group.findUnique({ where: { inviteCode: code } });
  if (!group) redirect(`/unirse/${encodeURIComponent(code)}`);

  // Joining moves the person here from any other group.
  await db.$transaction([
    db.membership.deleteMany({ where: { userId, groupId: { not: group.id } } }),
    db.membership.upsert({ where: { groupId_userId: { groupId: group.id, userId } }, create: { groupId: group.id, userId }, update: {} }),
  ]);
  revalidatePath("/");
  redirect("/");
}
