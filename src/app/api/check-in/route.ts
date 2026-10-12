import { auth } from "@/auth";
import { checkInDay, isDayKey } from "@/lib/days";
import { getAppTimeZone } from "@/lib/env";
import { saveCheckIn } from "@/lib/queries";

/**
 * Answers from the notification's Sí / No buttons (sent by the service worker with the session cookie). The day
 * comes with the notification, so an answer tapped after the day closed is refused instead of landing on the next.
 */
export async function POST(request: Request) {
  const userId = (await auth())?.user?.id;
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  // JSON only: a cross-site form can't send it without a CORS preflight, which this route never allows.
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "unsupported" }, { status: 415 });

  const body = (await request.json().catch(() => null)) as { day?: unknown; relapsed?: unknown } | null;
  if (!body || !isDayKey(body.day) || typeof body.relapsed !== "boolean") return Response.json({ error: "invalid" }, { status: 400 });
  if (body.day !== checkInDay(new Date(), getAppTimeZone())) return Response.json({ error: "closed" }, { status: 409 });

  await saveCheckIn(userId, body.day, body.relapsed);
  return Response.json({ ok: true });
}
