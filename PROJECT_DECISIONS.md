# Project Decisions

Last updated: 2026-10-12

## Product scope

- Solo por hoy is an accountability app for people trying to stop a habit, used in a small group. Every night it asks "¿Recaíste hoy?"; each person answers Sí, No, or nothing. The next morning everyone in the group is told how each person did.
- Delivered as a mobile-first installable PWA, targeting Android (Chrome) first, deployed to Vercel. iPhones (iOS 16.4+) are supported once the app is added to the home screen, which is the only way iOS allows web notifications; iOS shows no notification buttons, so tapping the nightly question opens the app to answer.
- MVP: two friends in one group. Communities by topic (alcohol, drugs, porn, …) holding groups people create, invite to, or request to join, and daily messages (stoicism, self-development), are planned for later; the schema keeps groups separate from check-ins so they can be added without moving data.
- The interface is Spanish only for now; there is no i18n layer yet.

## Domain model

- **Group**: a name and an invite code. People join by invite link (`/unirse/<code>`) or by typing the code. For now a person belongs to at most one group: creating or joining a group leaves any other (the database allows several, so this can be relaxed later).
- **Check-in**: one per person per day, `relapsed` true (Sí) or false (No). A day with no row is "no answer". Check-ins belong to the person, not the group. The answer can be changed until the day closes.
- **Push subscription**: one per device that turned on reminders. Expired ones (404/410 from the push service) are deleted when sending.
- **Broadcast**: one row per kind (nightly prompt, morning report) per day, so a cron call repeated on the same day sends nothing.

## Days

- Days are calendar dates in `APP_TIME_ZONE` (default `America/Tijuana`), stored as `@db.Date`.
- A check-in made before 05:00 (`DAY_ROLLOVER_HOUR`) counts for the day before, so a late answer after midnight is about the night that just ended. An answer to a notification is for the day the notification asked about; once that day has closed it's refused (409) and the app opens instead.
- The morning report is about the calendar day before the morning it runs.
- Someone who joined on a day isn't counted in reports for earlier days, and the week grid leaves those days blank.
- Clean streak: consecutive days answered No, ending today, or ending yesterday while today is unanswered. A relapse or an unanswered day ends it.

## Privacy

- In the app, others' answers for today stay hidden until the day closes; the group only sees whether each person has answered. Answers for past days are visible to the whole group.
- Sign-in is restricted to the emails in `ALLOWED_EMAILS`; without it every sign-in is refused. An invite link alone doesn't grant access.

## Notifications

- Web Push (VAPID) through a hand-written service worker (`public/sw.js`), served with no caching.
- The nightly prompt has "No, me mantuve" and "Sí, recaí" buttons. The service worker posts the answer to `/api/check-in` with the session cookie and shows a confirmation; if that fails (signed out, day closed, offline) it opens the app. Sessions last 180 days for this reason.
- The nightly prompt goes only to people who haven't answered that day. It's kept by the push service for 10 hours, the report for 12, and a newer undelivered message replaces an older one of the same kind.
- Times: Vercel Cron in UTC (`vercel.json`): nightly at 04:00 UTC (21:00 in Tijuana in summer, 20:00 in winter) and morning at 15:00 UTC (08:00 summer, 07:00 winter). On the Hobby plan a cron can fire any time within its hour. Cron routes require `Authorization: Bearer $CRON_SECRET`.
- "Enviar prueba" sends tonight's question to the person's own devices to check reminders work end to end.

## Brand

- Dark-only. Night background (`#0b1020`) with a dawn accent (`#f4a259`); clean is teal-green, relapse coral, no answer gray. Inter for text, Fraunces for headings. The icon is a sun rising over the horizon (`public/icons/*-source.svg`, rendered with `npm run icons`).

## Stack

- Same stack as yield-personal: Next.js 16 App Router, TypeScript, Tailwind CSS v4, Postgres through Prisma 7 (`@prisma/adapter-pg`, client in `src/generated/prisma`), Auth.js v5 with Google and JWT sessions (users and accounts stored through the Prisma adapter).
- Environment variables are read where they are used, so the build needs no credentials; `prisma generate` works without a database URL.
- Vercel deployments run `prisma migrate deploy` before `next build`. Migrations use the direct (non-pooled) Prisma Postgres host.
- Every Server Action and API route re-checks the session and acts only for the signed-in user.
