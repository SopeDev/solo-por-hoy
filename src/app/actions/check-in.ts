"use server";

import { revalidatePath } from "next/cache";
import { requireActionUserId } from "@/lib/auth-user";
import { checkInDay } from "@/lib/days";
import { getAppTimeZone } from "@/lib/env";
import { saveCheckIn } from "@/lib/queries";

/** Answers for the day that's open now; it can be changed until the day closes. */
export async function answerToday(relapsed: boolean) {
  const userId = await requireActionUserId();
  await saveCheckIn(userId, checkInDay(new Date(), getAppTimeZone()), relapsed === true);
  revalidatePath("/");
}
