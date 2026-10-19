# Project Decisions

Last updated: 2026-10-14

## Product scope

- Solo por hoy is an accountability app for people trying to stop a habit, used in a small group. Every night it asks "¿Te mantuviste hoy?"; each person answers Sí (clean), No (relapsed), or nothing. The question is framed around staying clean, not around failing. The next morning everyone in the group is told how each person did.
- Delivered as a mobile-first installable PWA, targeting Android (Chrome) first, deployed to Vercel. iPhones (iOS 16.4+) are supported once the app is added to the home screen, which is the only way iOS allows web notifications; iOS shows no notification buttons, so tapping the nightly question opens the app to answer.
- MVP: two friends in one group. Communities by topic (alcohol, drugs, porn, …) holding groups people create, invite to, or request to join, and daily messages (stoicism, self-development), are planned for later; the schema keeps groups separate from check-ins so they can be added without moving data.
- The interface is Spanish only for now; there is no i18n layer yet.

## Domain model

- **Group**: a name and an invite code. People join by invite link (`/unirse/<code>`) or by typing the code. For now a person belongs to at most one group: creating or joining a group leaves any other (the database allows several, so this can be relaxed later).
- **Roles**: each membership is a participant (does the challenge) or a supporter, "acompañante" (`role`, default participant). Supporters get no nightly question, have no streak, and don't count in reports, the week grid or the group streak; they get the SOS and the morning report (titled with a call to act when someone relapsed or hit a milestone) and send one-tap messages and reminders to participants. They see answers and notes like everyone in the group, and the join and settings screens say so. The role is chosen when joining by invite and can be switched by the person in Ajustes, or by the group's creator. Becoming a participant starts counting that day (`participatingSince`), so earlier days aren't "no answer".
- **Group admin**: whoever created the group (`createdById`) can rename it, remove members, and replace the invite link. Removing someone also replaces the link, so the old one can't bring them back. Anyone can leave; if the creator leaves, the longest-standing member takes over, and the last one out deletes the group. No roles until communities exist.
- **Corrections**: the group's creator can record or correct anyone's answer (their own included) for a closed day within the last 30 days and since the person joined, from Ajustes. It's stored with `correctedById` and shown as "corregido"; if the person later answers that day themselves, their answer replaces it. Today can't be corrected: it's the person's own until it closes.
- **Check-in**: one per person per day, `relapsed` false ("Sí, me mantuve") or true ("No, recaí"), with an optional note (280 characters). A day with no row is "no answer". Check-ins belong to the person, not the group. The answer can be changed until the day closes.
- **Profile**: an optional nickname the group sees instead of the Google first name, and a private "porqué" (140 characters) shown only to the person under the nightly question.
- **Signal**: a push one person sends. SOS ("Necesito apoyo") goes to everyone else in the group right away, at most once per 30 minutes. A one-tap message fitted to the person's yesterday (👏 "te felicita por ayer" after a clean day, 💪 "te manda ánimo" after a relapse, 💛 "pensó en ti, ¿cómo vas?" after no answer, adding that yesterday can still be answered while it's open) and a reminder to answer ("Recordarle", with the answer buttons) go to one groupmate, once a day per person; a reminder only after tonight's question went out, and only to someone who hasn't answered today.
- **Push subscription**: one per device that turned on reminders. Expired ones (404/410 from the push service) are deleted when sending.
- **Broadcast**: one row per kind (nightly prompt, morning report) per day, so a cron call repeated on the same day sends nothing.

## Days

- Days are calendar dates in `APP_TIME_ZONE` (default `America/Tijuana`), stored as `@db.Date`.
- A check-in made before 05:00 (`DAY_ROLLOVER_HOUR`) counts for the day before, so a late answer after midnight is about the night that just ended. An answer to a notification is for the day the notification asked about; once that day has closed it's refused (409) and the app opens instead.
- A missed yesterday can still be answered, once, until the morning report about it goes out (from the app, or from last night's notification). After the report the day is closed for good, so the report is always final. Notes can be added to yesterday in the same window.
- The morning report is about the calendar day before the morning it runs. It also celebrates clean streaks reaching 7, 14, 30, 60, 90, 180 and 365 days, then every year.
- Someone who joined on a day isn't counted in reports for earlier days, and the week grid leaves those days blank.
- Clean streak: consecutive clean days, ending today, or ending yesterday while today is unanswered. A relapse or an unanswered day ends it.
- Total clean days count every clean day ever and never reset, so a relapse ends the streak without erasing the history.
- Group streak: consecutive closed days (ending yesterday) on which everyone in the group answered "Sí, me mantuve"; a relapse or a missing answer from anyone ends it, and people count from the day they joined. It ends at yesterday so it never reveals today's answers. Shown on home and in the morning report (from 2 days). No rankings between members.
- The sunrise on home shows the personal streak beside a sun that rises with it (faster in the first days so they show), fully up at 90 days.
- The clean-day rate counts today only once it's answered, so it doesn't drop every morning.

## Privacy

- In the app, others' answers and notes for today stay hidden until the day closes; the group only sees whether each person has answered. Answers and notes for past days are visible to the whole group.
- Sign-in is restricted to the emails in `ALLOWED_EMAILS`; without it every sign-in is refused. An invite link alone doesn't grant access.

## Notifications

- Web Push (VAPID) through a hand-written service worker (`public/sw.js`), served with no caching.
- The nightly prompt has "Sí, me mantuve" and "No, recaí" buttons. The service worker posts the answer to `/api/check-in` with the session cookie and shows a confirmation; if that fails (signed out, day closed, offline) it opens the app. Sessions last 180 days for this reason.
- The nightly prompt goes only to people who haven't answered that day. It's kept by the push service for 10 hours, the report for 12, and a newer undelivered message replaces an older one of the same kind.
- Times: Vercel Cron in UTC (`vercel.json`): nightly at 04:00 UTC (21:00 in Tijuana in summer, 20:00 in winter) and morning at 15:00 UTC (08:00 summer, 07:00 winter). On the Hobby plan a cron can fire any time within its hour. Cron routes require `Authorization: Bearer $CRON_SECRET`.
- Group messages (SOS, encouragement) use their own notification tag per sender and kind, so they don't replace the morning report. An SOS is kept by the push service for 1 hour only.
- Per-person reminder times aren't possible while on the Vercel Hobby plan (one run per cron per day).
- "Enviar prueba" sends tonight's question to the person's own devices to check reminders work end to end.

## Screens

- Home: a missed-yesterday card when it applies, today's question with the person's porqué, streak / best streak / clean-day rate, SOS, yesterday's results with notes and encouragement, the week grid with reminders for who hasn't answered, and the device card only until the app is installed and reminders are on.
- Settings (`/ajustes`, gear in the header): profile, group (members, admin actions, invite link, leave), this device, sign out.

## Brand

- Dark-only. Night background (`#0b1020`) with a dawn accent (`#f4a259`); clean is teal-green, relapse coral, no answer gray. Inter for text, Fraunces for headings. The icon is a sun rising over the horizon (`public/icons/*-source.svg`, rendered with `npm run icons`).

## Stack

- Same stack as yield-personal: Next.js 16 App Router, TypeScript, Tailwind CSS v4, Postgres through Prisma 7 (`@prisma/adapter-pg`, client in `src/generated/prisma`), Auth.js v5 with Google and JWT sessions (users and accounts stored through the Prisma adapter).
- Environment variables are read where they are used, so the build needs no credentials; `prisma generate` works without a database URL.
- Vercel deployments run `prisma migrate deploy` before `next build`. Migrations use the direct (non-pooled) Prisma Postgres host.
- Every Server Action and API route re-checks the session and acts only for the signed-in user.
