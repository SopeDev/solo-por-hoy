import { addDays, type DayKey } from "./days";

/** What happened on a day: answered "No" (clean), answered "Sí" (relapsed), or no answer. */
export type DayStatus = "clean" | "relapsed" | "silent";

export function statusOf(answer: boolean | undefined): DayStatus {
  if (answer === undefined) return "silent";
  return answer ? "relapsed" : "clean";
}

/**
 * Consecutive clean days ending today, or ending yesterday while today is still unanswered. A relapse or a day
 * without an answer ends the streak.
 */
export function cleanStreak(answers: ReadonlyMap<DayKey, boolean>, today: DayKey) {
  let day = answers.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (answers.get(day) === false) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

/** The longest run of consecutive clean days ever. */
export function longestStreak(answers: ReadonlyMap<DayKey, boolean>) {
  let longest = 0;
  for (const [day, relapsed] of answers) {
    // Count only from the start of each run.
    if (relapsed || answers.get(addDays(day, -1)) === false) continue;
    let length = 0;
    while (answers.get(addDays(day, length)) === false) length += 1;
    longest = Math.max(longest, length);
  }
  return longest;
}

/**
 * Share of days answered "Sí, me mantuve" from the first answer through today, unanswered days included. Today only
 * counts once it's answered, so the rate doesn't drop every morning before there's been a chance to answer.
 */
export function cleanRate(answers: ReadonlyMap<DayKey, boolean>, today: DayKey) {
  const last = answers.has(today) ? today : addDays(today, -1);
  const days = [...answers.keys()].filter((day) => day <= last).sort();
  if (days.length === 0) return null;
  let total = 0;
  let clean = 0;
  for (let day = days[0]; day <= last; day = addDays(day, 1)) {
    total += 1;
    if (answers.get(day) === false) clean += 1;
  }
  return clean / total;
}

/** Every clean day ever. Unlike the streak, a relapse never takes these away. */
export function totalCleanDays(answers: ReadonlyMap<DayKey, boolean>) {
  let total = 0;
  for (const relapsed of answers.values()) if (!relapsed) total += 1;
  return total;
}

export type GroupStreakMember = { joinedDay: DayKey; answers: ReadonlyMap<DayKey, boolean> };

/**
 * Consecutive days, ending with `last`, on which everyone in the group answered "Sí, me mantuve". A relapse or a
 * missing answer from anyone ends it; people count from the day they joined. Ends at a closed day so it never
 * reveals today's answers.
 */
export function groupStreak(members: GroupStreakMember[], last: DayKey) {
  let streak = 0;
  for (let day = last; ; day = addDays(day, -1)) {
    const present = members.filter((member) => member.joinedDay <= day);
    if (present.length === 0 || !present.every((member) => member.answers.get(day) === false)) return streak;
    streak += 1;
  }
}

const MILESTONES = [7, 14, 30, 60, 90, 180, 365];

/** Streak lengths the group celebrates: the first week, the months, then every year. */
export function isMilestone(streak: number) {
  return MILESTONES.includes(streak) || (streak > 365 && streak % 365 === 0);
}

/** "1 semana", "30 días", "1 año" */
export function milestoneLabel(streak: number) {
  if (streak % 365 === 0) return streak === 365 ? "1 año" : `${streak / 365} años`;
  if (streak === 7) return "1 semana";
  if (streak === 14) return "2 semanas";
  return `${streak} días`;
}

export type ReportMember = { name: string; answer: boolean | undefined };

export type DayReport = Record<DayStatus, string[]>;

export function dayReport(members: ReportMember[]): DayReport {
  const report: DayReport = { clean: [], relapsed: [], silent: [] };
  for (const member of members) report[statusOf(member.answer)].push(member.name);
  return report;
}

/** "Jorge", "Jorge y Luis", "Ana, Jorge y Luis" */
export function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} y ${names.at(-1)}`;
}

/** The morning notification's text: "✅ Jorge se mantuvo · ❌ Luis recayó · 🤐 Ana no respondió". */
export function reportMessage(report: DayReport, extras: { milestones?: { name: string; streak: number }[]; groupStreak?: number } = {}) {
  const lines: string[] = [];
  const plural = (names: string[], one: string, many: string) => (names.length === 1 ? one : many);
  if (report.clean.length) lines.push(`✅ ${joinNames(report.clean)} ${plural(report.clean, "se mantuvo", "se mantuvieron")}`);
  if (report.relapsed.length) lines.push(`❌ ${joinNames(report.relapsed)} ${plural(report.relapsed, "recayó", "recayeron")}`);
  if (report.silent.length) lines.push(`🤐 ${joinNames(report.silent)} no ${plural(report.silent, "respondió", "respondieron")}`);
  for (const { name, streak } of extras.milestones ?? []) lines.push(`🎉 ${name} cumple ${milestoneLabel(streak)}`);
  if (extras.groupStreak && extras.groupStreak >= 2) lines.push(`🔥 El grupo lleva ${extras.groupStreak} días limpio`);
  return lines.join(" · ");
}

/** The nickname the person chose, else the first name from Google, else the part of the email before "@". */
export function displayName(user: { name: string | null; email: string | null; nickname?: string | null }) {
  if (user.nickname?.trim()) return user.nickname.trim();
  const first = user.name?.trim().split(/\s+/)[0];
  return first || user.email?.split("@")[0] || "Alguien";
}
