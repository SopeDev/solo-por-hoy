"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { requireActionUserId } from "@/lib/auth-user";
import { checkInDay } from "@/lib/days";
import { getAppTimeZone } from "@/lib/env";
import { promptPayload, sendPush } from "@/lib/push";

const subscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function saveSubscription(subscription: unknown) {
  const userId = await requireActionUserId();
  const { endpoint, keys } = subscriptionSchema.parse(subscription);
  // An endpoint belongs to one browser; if someone else signed in on it before, it's theirs now.
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
  });
}

export async function removeSubscription(endpoint: string) {
  const userId = await requireActionUserId();
  await db.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

/** Sends tonight's question to the person's own devices now, to check reminders work. */
export async function sendTestPrompt() {
  const userId = await requireActionUserId();
  const result = await sendPush([userId], promptPayload(checkInDay(new Date(), getAppTimeZone())), { ttl: 60 * 60, topic: "test" });
  return result.sent > 0;
}
