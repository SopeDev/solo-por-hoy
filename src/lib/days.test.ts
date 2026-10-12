import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDays, checkInDay, daysEndingOn, isDayKey, localDay } from "./days";

const TZ = "America/Tijuana";

describe("checkInDay", () => {
  it("is the local date during the day and evening", () => {
    // 21:00 in Tijuana (PDT, UTC-7) is 04:00 UTC the next day.
    assert.equal(checkInDay(new Date("2026-10-13T04:00:00Z"), TZ), "2026-10-12");
  });

  it("still counts the night after midnight as the day before", () => {
    // 01:30 local on Oct 13.
    assert.equal(checkInDay(new Date("2026-10-13T08:30:00Z"), TZ), "2026-10-12");
    assert.equal(localDay(new Date("2026-10-13T08:30:00Z"), TZ), "2026-10-13");
  });

  it("moves to the new day at the rollover hour", () => {
    // 05:00 local on Oct 13.
    assert.equal(checkInDay(new Date("2026-10-13T12:00:00Z"), TZ), "2026-10-13");
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
