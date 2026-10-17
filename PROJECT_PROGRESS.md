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
- Slice 2, support and settings:
  - Settings page: nickname, private "porqué", device setup (now hidden from home once ready), sign out.
  - Group admin: rename, remove members (replaces the invite link), new invite link, leave group with ownership handover.
  - Optional note on each day's answer, shown to the group once the day closes.
  - Missed yesterday can be answered until the morning report goes out.
  - SOS to the group, one-tap encouragement, and reminders to whoever hasn't answered.
  - Best streak and clean-day rate on home; streak milestones in the morning report.
  - Migration `20261014000000_support_and_settings` checked against a local Postgres.
  - Gamification: total clean days, group streak (everyone clean), and a sunrise that rises with the streak.
- Home polish after first use: redrawn sunrise with the streak in it, clean-day rate no longer counts unanswered today, "Recordarle" only after tonight's question, icon-only encouragement, compact SOS row.
- The one-tap message fits how the person's yesterday went: 👏 clean, 💪 relapse, 💛 no answer.
- Group creator can correct a closed day's answer from Ajustes (marked "corregido"); migration `20261017000000_check_in_corrections`.
- iPhone guidance: Share › “Agregar a inicio” install steps, an iOS 16.4+ note, and iOS settings path for blocked notifications.

## Next

- Install on the second phone. On an iPhone, check that Google sign-in from the installed app comes back signed in, and that the nightly question and morning report arrive.
- After a few days of use: adjust notification times and wording; see whether SOS, encouragement and reminders get used.
- Maybe later: fichas (chips) for milestones on a profile.
- Later: communities by topic with groups inside them (create, invite, request to join), and daily messages.
