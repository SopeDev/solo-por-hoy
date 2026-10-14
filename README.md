# Solo por hoy

Every night: "¿Te mantuviste hoy?". Every morning: your group finds out how everyone did. An installable PWA (Android first).

See `PROJECT_DECISIONS.md` for how it works and `PROJECT_PROGRESS.md` for what's done.

## Setup

1. Copy `.env.example` to `.env.local` and fill it in:
   - `DATABASE_URL`: a Postgres database (Prisma Postgres through Vercel's Storage tab works).
   - `AUTH_SECRET`: `npx auth secret`.
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`: a Google OAuth client (Web application) with redirect URIs
     `http://localhost:3000/api/auth/callback/google` and `https://<your-domain>/api/auth/callback/google`.
   - `ALLOWED_EMAILS`: the Google emails allowed in, comma-separated.
   - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: `npx web-push generate-vapid-keys`. `VAPID_SUBJECT`: `mailto:<your email>`.
   - `CRON_SECRET`: `openssl rand -hex 32`.
2. `npm install`, then `npm run db:migrate` and `npm run dev`.

Notifications need HTTPS; test them on the deployed site (or with `next dev --experimental-https`).

To trigger a send by hand: `curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/nightly` (or `/morning`). Each runs once per day; use "Enviar prueba" in the app to test reminders any time.

## Checks

`npm run check` runs lint, typecheck, tests, and a production build.
