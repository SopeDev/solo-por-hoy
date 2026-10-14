"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { requireActionUserId } from "@/lib/auth-user";

const profile = z.object({
  nickname: z.string().trim().max(24),
  why: z.string().trim().max(140),
});

/** How the group sees the person's name, and their own reason to stay clean. Empty fields are cleared. */
export async function saveProfile(formData: FormData) {
  const userId = await requireActionUserId();
  const parsed = profile.safeParse({ nickname: formData.get("nickname") ?? "", why: formData.get("why") ?? "" });
  if (!parsed.success) return;
  await db.user.update({ where: { id: userId }, data: { nickname: parsed.data.nickname || null, why: parsed.data.why || null } });
  revalidatePath("/", "layout");
}
