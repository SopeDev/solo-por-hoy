/** Days are calendar dates as "YYYY-MM-DD" keys, decided in the app's time zone. */
export type DayKey = string;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The calendar date in the time zone. */
export function localDay(now: Date, timeZone: string): DayKey {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * The day a check-in made now answers for: the calendar day, so a day can be answered until 11:59 p.m. and the app
 * moves to the next day at midnight. A late answer to last night's notification still lands on that night, through
 * the missed-yesterday window (see `canAnswer`).
 */
export function checkInDay(now: Date, timeZone: string): DayKey {
  return localDay(now, timeZone);
}

export function addDays(day: DayKey, days: number): DayKey {
  return new Date(dateOfDay(day).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** The value stored in a `@db.Date` column for a day. */
export function dateOfDay(day: DayKey) {
  return new Date(`${day}T00:00:00Z`);
}

export function dayOfDate(date: Date): DayKey {
  return date.toISOString().slice(0, 10);
}

export function isDayKey(value: unknown): value is DayKey {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && dayOfDate(dateOfDay(value)) === value;
}

/** The `count` days ending with `last`, oldest first. */
export function daysEndingOn(last: DayKey, count: number): DayKey[] {
  return Array.from({ length: count }, (_, index) => addDays(last, index - count + 1));
}

/** "lunes 12 de octubre" */
export function formatDay(day: DayKey) {
  return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(dateOfDay(day));
}

/** "L", "M", … for the history grid. */
export function weekdayInitial(day: DayKey) {
  return new Intl.DateTimeFormat("es-MX", { weekday: "narrow", timeZone: "UTC" }).format(dateOfDay(day)).toUpperCase();
}
