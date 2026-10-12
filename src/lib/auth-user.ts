import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const getCurrentUserId = cache(async () => {
  const session = await auth();
  return session?.user?.id ?? null;
});

/** For pages: sends a signed-out visitor to sign in, then back to `returnTo`. */
export async function requireUserId(returnTo = "/") {
  const userId = await getCurrentUserId();
  if (!userId) redirect(returnTo === "/" ? "/entrar" : `/entrar?next=${encodeURIComponent(returnTo)}`);
  return userId;
}

/** Server Actions are reachable by direct POST, so each one re-checks the session. */
export async function requireActionUserId() {
  const userId = (await auth())?.user?.id;
  if (!userId) throw new Error("Unauthorized");
  return userId;
}
