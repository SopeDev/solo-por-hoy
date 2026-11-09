import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDays, addMonths, checkInDay, daysEndingOn, formatMonth, formatWeek, isDayKey, isMonthKey, localDay, monthWeeks, weekStart } from "./days";

const TZ = "America/Tijuana";

describe("checkInDay", () => {
  it("is the local date during the day and evening", () => {
    // 21:00 in Tijuana (PDT, UTC-7) is 04:00 UTC the next day.
    assert.equal(checkInDay(new Date("2026-10-13T04:00:00Z"), TZ), "2026-10-12");
  });

  it("moves to the new day at midnight", () => {
    // 23:59 local on Oct 12, then 00:25 local on Oct 13.
    assert.equal(checkInDay(new Date("2026-10-13T06:59:00Z"), TZ), "2026-10-12");
    assert.equal(checkInDay(new Date("2026-10-13T07:25:00Z"), TZ), "2026-10-13");
    assert.equal(localDay(new Date("2026-10-13T07:25:00Z"), TZ), "2026-10-13");
  });

  it("follows daylight saving time", () => {
    // After Nov 1 Tijuana is PST (UTC-8): 04:30 UTC is 20:30 local on Nov 2.
    assert.equal(checkInDay(new Date("2026-11-03T04:30:00Z"), TZ), "2026-11-02");
  });
});

describe("day keys", () => {
  it("adds days across months and years", () => {
    assert.equal(addDays("2026-10-31", 1), "2026-11-01");
    assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  });

  it("lists days ending on a day, oldest first", () => {
    assert.deepEqual(daysEndingOn("2026-10-02", 3), ["2026-09-30", "2026-10-01", "2026-10-02"]);
  });

  it("validates keys", () => {
    assert.equal(isDayKey("2026-10-12"), true);
    assert.equal(isDayKey("2026-02-30"), false);
    assert.equal(isDayKey("12/10/2026"), false);
    assert.equal(isDayKey(20261012), false);
  });
});

describe("calendar", () => {
  it("finds the Monday of a week", () => {
    assert.equal(weekStart("2026-10-19"), "2026-10-19"); // Monday
    assert.equal(weekStart("2026-10-25"), "2026-10-19"); // Sunday
  });

  it("lays out a month in whole weeks, Monday first", () => {
    const weeks = monthWeeks("2026-10");
    assert.equal(weeks[0][0], "2026-09-28");
    assert.equal(weeks.at(-1)!.at(-1), "2026-11-01");
    assert.equal(weeks.length, 5);
    assert.ok(weeks.every((week) => week.length === 7));
  });

  it("moves between months and validates them", () => {
    assert.equal(addMonths("2026-01", -1), "2025-12");
    assert.equal(addMonths("2026-10", 3), "2027-01");
    assert.equal(isMonthKey("2026-10"), true);
    assert.equal(isMonthKey("2026-13"), false);
  });

  it("labels weeks", () => {
    assert.equal(formatWeek("2026-10-19"), "19 – 25 oct");
    assert.equal(formatWeek("2026-10-26"), "26 oct – 1 nov");
    assert.equal(formatMonth("2026-10"), "Octubre de 2026");
  });
});
