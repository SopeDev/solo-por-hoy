"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { requireActionUserId } from "@/lib/auth-user";
import { dateOfDay, isDayKey } from "@/lib/days";
import { canAnswer, canWriteNote, saveCheckIn } from "@/lib/queries";

const note = z.string().trim().max(280);

/** Answers for today (changeable until the day closes), or for yesterday if it was missed and is still open. */
export async function answerDay(day: string, relapsed: boolean) {
  const userId = await requireActionUserId();
  if (!isDayKey(day) || !(await canAnswer(userId, day))) return { ok: false as const };
  await saveCheckIn(userId, day, relapsed === true);
  revalidatePath("/");
  return { ok: true as const };
}

/** A few words about the day, kept with its answer. An empty note removes it. */
export async function saveNote(day: string, text: string) {
  const userId = await requireActionUserId();
  const parsed = note.safeParse(text);
  if (!isDayKey(day) || !parsed.success || !(await canWriteNote(userId, day))) return { ok: false as const };
  const { count } = await db.checkIn.updateMany({ where: { userId, day: dateOfDay(day) }, data: { note: parsed.data || null } });
  revalidatePath("/");
  return { ok: count > 0 };
}
