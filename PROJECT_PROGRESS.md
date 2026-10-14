# Project Progress

Last updated: 2026-10-14

## Completed

- Scaffolded Next.js 16.3.4 (TypeScript, Tailwind v4, ESLint, React Compiler, `src/` layout); `AGENTS.md` copied from yield-personal.
- Brand: palette, fonts, sunrise icon set (any, maskable, Apple touch, notification badge), PWA manifest.
- Slice 1, MVP:
  - Prisma schema and initial migration: users and auth, groups, memberships, check-ins, push subscriptions, broadcasts.
  - Google sign-in restricted to allow-listed emails, returning to an invite link after signing in.
  - Create a group or join one by invite link or code; share the invite link.
  - Home: today's question (Sí / No, changeable until the day closes), clean streak, yesterday's results for the group, a 7-day grid (others' answers for today hidden), install button, and reminders on/off with a test send.
  - Service worker: nightly question with answer buttons on the notification, morning report, confirmation after answering.
  - Vercel Cron routes for the nightly prompt and morning report, each sent once per day.
  - Tests for day boundaries (rollover hour, daylight saving), streaks, and the report text; migration and the send flow checked against an embedded Postgres with a mock push service.
- Deployed to https://solo-por-hoy.vercel.app with Prisma Postgres; the initial migration is applied.
- Rewrote the sign-in and first-run copy around shared accountability instead of describing the mechanics.
- Installed on Android; a test notification arrived.
- Reframed the nightly question as "¿Te mantuviste hoy?" (Sí, me mantuve / No, recaí) in the app and the notification.
- iPhone guidance: Share › “Agregar a inicio” install steps, an iOS 16.4+ note, and iOS settings path for blocked notifications.

## Next

- Install on the second phone. On an iPhone, check that Google sign-in from the installed app comes back signed in, and that the nightly question and morning report arrive.
- After a few days of use: adjust notification times and wording; consider a reminder for anyone who still hasn't answered later in the night.
- Later: communities by topic with groups inside them (create, invite, request to join), and daily messages.
