import { sendNightlyPrompts } from "@/lib/broadcasts";
import { isCronRequest } from "@/lib/env";

/** Vercel Cron, each evening (see `vercel.json`): asks "¿Te mantuviste hoy?" to whoever hasn't answered. */
export async function GET(request: Request) {
  if (!isCronRequest(request.headers.get("authorization"))) return new Response("Unauthorized", { status: 401 });
  return Response.json(await sendNightlyPrompts(new Date()));
}
