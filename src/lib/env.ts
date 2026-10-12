// Each setting is read where it is used, so a missing variable fails only the feature that needs it
// and never the build.

const DEFAULT_TIME_ZONE = "America/Tijuana";

export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL (or POSTGRES_URL) is not configured");
  return url;
}

export function getAppTimeZone() {
  return process.env.APP_TIME_ZONE || DEFAULT_TIME_ZONE;
}

/** Without ALLOWED_EMAILS nobody can sign in: check-ins are private, so it fails closed. */
export function isAllowedEmail(email: string | null | undefined) {
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) {
    console.error("ALLOWED_EMAILS is not configured; refusing all sign-ins.");
    return false;
  }

  return Boolean(email) && allowed.includes(email!.toLowerCase());
}

/** Null when reminders aren't configured; the app still works, it just can't send notifications. */
export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function getVapidDetails() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) throw new Error("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must be configured");
  return { publicKey, privateKey, subject };
}

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Without the secret every cron call is refused. */
export function isCronRequest(authorization: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not configured; refusing cron requests.");
    return false;
  }
  return authorization === `Bearer ${secret}`;
}
