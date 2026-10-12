# Project Progress

Last updated: 2026-10-12

## Completed

- Scaffolded Next.js 16.3.4 (TypeScript, Tailwind v4, ESLint, React Compiler, `src/` layout); `AGENTS.md` copied from yield-personal.
- Brand: palette, fonts, sunrise icon set (any, maskable, Apple touch, notification badge), PWA manifest.
- Slice 1, MVP:
  - Prisma schema and initial migration: users and auth, groups, memberships, check-ins, push subscriptions, broadcasts.
  - Google sign-in restricted to allow-listed emails, returning to an invite link after signing in.
  - Create a group or join one by invite link or code; share the invite link.
  - Home: today's question (No / Sí, changeable until the day closes), clean streak, yesterday's results for the group, a 7-day grid (others' answers for today hidden), install button, and reminders on/off with a test send.
  - Service worker: nightly question with answer buttons on the notification, morning report, confirmation after answering.
  - Vercel Cron routes for the nightly prompt and morning report, each sent once per day.
  - Tests for day boundaries (rollover hour, daylight saving), streaks, and the report text; migration and the send flow checked against an embedded Postgres with a mock push service.
- Deployed to https://solo-por-hoy.vercel.app with Prisma Postgres; the initial migration is applied.
- Rewrote the sign-in and first-run copy around shared accountability instead of describing the mechanics.

## Next

- Finish deploy setup: Google OAuth client, the remaining environment variables (`AUTH_*`, `ALLOWED_EMAILS`, `VAPID_*`, `CRON_SECRET`, `APP_TIME_ZONE`), redeploy, then install on both phones and enable reminders.
- After a few days of use: adjust notification times and wording; consider a reminder for anyone who still hasn't answered later in the night.
- Later: communities by topic with groups inside them (create, invite, request to join), and daily messages.
