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
export function reportMessage(report: DayReport) {
  const lines: string[] = [];
  const plural = (names: string[], one: string, many: string) => (names.length === 1 ? one : many);
  if (report.clean.length) lines.push(`✅ ${joinNames(report.clean)} ${plural(report.clean, "se mantuvo", "se mantuvieron")}`);
  if (report.relapsed.length) lines.push(`❌ ${joinNames(report.relapsed)} ${plural(report.relapsed, "recayó", "recayeron")}`);
  if (report.silent.length) lines.push(`🤐 ${joinNames(report.silent)} no ${plural(report.silent, "respondió", "respondieron")}`);
  return lines.join(" · ");
}

/** First name from the Google profile, else the part of the email before "@". */
export function displayName(user: { name: string | null; email: string | null }) {
  const first = user.name?.trim().split(/\s+/)[0];
  return first || user.email?.split("@")[0] || "Alguien";
}
