import "server-only";

import webpush, { WebPushError } from "web-push";
import { db } from "@/db/client";
import type { DayKey } from "./days";
import { getVapidDetails } from "./env";

/** What the service worker (`public/sw.js`) receives. A prompt carries the day its Sí / No buttons answer. */
export type PushPayload =
  | { type: "prompt"; title: string; body: string; day: DayKey }
  | { type: "report"; title: string; body: string };

type SendOptions = {
  /** Seconds the push service keeps trying to deliver to an offline phone. */
  ttl: number;
  /** A newer undelivered message with the same topic replaces an older one. */
  topic: string;
};

/** Sends to every device of these people; subscriptions the push service reports gone are removed. */
export async function sendPush(userIds: string[], payload: PushPayload, options: SendOptions) {
  if (userIds.length === 0) return { sent: 0, failed: 0 };

  const { publicKey, privateKey, subject } = getVapidDetails();
  const subscriptions = await db.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  const body = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, body, {
        vapidDetails: { subject, publicKey, privateKey },
        TTL: options.ttl,
        topic: options.topic,
        urgency: "high",
      }),
    ),
  );

  const gone: string[] = [];
  let failed = 0;
  results.forEach((result, index) => {
    if (result.status === "fulfilled") return;
    const error = result.reason;
    if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
      gone.push(subscriptions[index].id);
    } else {
      failed += 1;
      console.error("Push failed", error);
    }
  });
  if (gone.length) await db.pushSubscription.deleteMany({ where: { id: { in: gone } } });

  return { sent: results.length - gone.length - failed, failed };
}

export function promptPayload(day: DayKey): PushPayload {
  return { type: "prompt", title: "¿Recaíste hoy?", body: "Responde aquí mismo. Solo por hoy.", day };
}
