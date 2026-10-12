import { sendMorningReports } from "@/lib/broadcasts";
import { isCronRequest } from "@/lib/env";

/** Vercel Cron, each morning (see `vercel.json`): tells every group how yesterday went. */
export async function GET(request: Request) {
  if (!isCronRequest(request.headers.get("authorization"))) return new Response("Unauthorized", { status: 401 });
  return Response.json(await sendMorningReports(new Date()));
}
