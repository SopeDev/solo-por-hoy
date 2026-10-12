/** Days are calendar dates as "YYYY-MM-DD" keys, decided in the app's time zone. */
export type DayKey = string;

/**
 * Answers given after midnight but before this hour still count for the day before, so a late "No" at 1 a.m. is
 * about the night that just ended. The morning report goes out after it.
 */
export const DAY_ROLLOVER_HOUR = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

function localParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

/** The calendar date in the time zone. */
export function localDay(now: Date, timeZone: string): DayKey {
  return localParts(now, timeZone).date;
}

/** The day a check-in made now answers for. */
export function checkInDay(now: Date, timeZone: string): DayKey {
  const { date, hour } = localParts(now, timeZone);
  return hour < DAY_ROLLOVER_HOUR ? addDays(date, -1) : date;
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
