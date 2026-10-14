import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanRate, cleanStreak, dayReport, displayName, groupStreak, isMilestone, joinNames, longestStreak, milestoneLabel, reportMessage, totalCleanDays } from "./check-ins";

describe("cleanStreak", () => {
  const answers = (entries: Record<string, boolean>) => new Map(Object.entries(entries));

  it("counts clean days ending today", () => {
    assert.equal(cleanStreak(answers({ "2026-10-10": false, "2026-10-11": false, "2026-10-12": false }), "2026-10-12"), 3);
  });

  it("keeps yesterday's streak while today is unanswered", () => {
    assert.equal(cleanStreak(answers({ "2026-10-10": false, "2026-10-11": false }), "2026-10-12"), 2);
  });

  it("restarts after a relapse", () => {
    assert.equal(cleanStreak(answers({ "2026-10-10": false, "2026-10-11": true, "2026-10-12": false }), "2026-10-12"), 1);
    assert.equal(cleanStreak(answers({ "2026-10-12": true }), "2026-10-12"), 0);
  });

  it("ends at a day without an answer", () => {
    assert.equal(cleanStreak(answers({ "2026-10-09": false, "2026-10-11": false, "2026-10-12": false }), "2026-10-12"), 2);
  });
});

describe("morning report", () => {
  it("groups members by how their day went", () => {
    const report = dayReport([
      { name: "Jorge", answer: false },
      { name: "Luis", answer: true },
      { name: "Ana", answer: undefined },
    ]);
    assert.deepEqual(report, { clean: ["Jorge"], relapsed: ["Luis"], silent: ["Ana"] });
    assert.equal(reportMessage(report), "✅ Jorge se mantuvo · ❌ Luis recayó · 🤐 Ana no respondió");
  });

  it("uses plurals and leaves out empty groups", () => {
    const report = dayReport([
      { name: "Jorge", answer: false },
      { name: "Luis", answer: false },
    ]);
    assert.equal(reportMessage(report), "✅ Jorge y Luis se mantuvieron");
  });

  it("joins names in Spanish", () => {
    assert.equal(joinNames(["Ana"]), "Ana");
    assert.equal(joinNames(["Ana", "Jorge", "Luis"]), "Ana, Jorge y Luis");
  });

  it("uses the first name, else the email", () => {
    assert.equal(displayName({ name: "Jorge Carlos Quevedo", email: "j@example.com" }), "Jorge");
    assert.equal(displayName({ name: null, email: "luis@example.com" }), "luis");
  });
});

describe("progress", () => {
  const answers = (entries: Record<string, boolean>) => new Map(Object.entries(entries));

  it("finds the longest clean run", () => {
    assert.equal(longestStreak(answers({})), 0);
    assert.equal(longestStreak(answers({ "2026-10-01": false, "2026-10-02": false, "2026-10-03": true, "2026-10-04": false })), 2);
    assert.equal(longestStreak(answers({ "2026-10-01": false, "2026-10-03": false, "2026-10-04": false, "2026-10-05": false })), 3);
  });

  it("counts unanswered days against the clean rate", () => {
    assert.equal(cleanRate(answers({}), "2026-10-04"), null);
    assert.equal(cleanRate(answers({ "2026-10-01": false, "2026-10-02": true, "2026-10-04": false }), "2026-10-04"), 0.5);
    // Today, still unanswered, doesn't count yet.
    assert.equal(cleanRate(answers({ "2026-10-12": false, "2026-10-13": false }), "2026-10-14"), 1);
  });

  it("celebrates weeks, months and years", () => {
    assert.deepEqual([6, 7, 14, 30, 31, 365, 730, 731].filter(isMilestone), [7, 14, 30, 365, 730]);
    assert.equal(milestoneLabel(7), "1 semana");
    assert.equal(milestoneLabel(30), "30 días");
    assert.equal(milestoneLabel(730), "2 años");
  });

  it("adds milestones to the morning report", () => {
    const report = dayReport([{ name: "Jorge", answer: false }]);
    assert.equal(reportMessage(report, { milestones: [{ name: "Jorge", streak: 30 }] }), "✅ Jorge se mantuvo · 🎉 Jorge cumple 30 días");
    assert.equal(reportMessage(report, { groupStreak: 1 }), "✅ Jorge se mantuvo");
    assert.equal(reportMessage(report, { groupStreak: 9 }), "✅ Jorge se mantuvo · 🔥 El grupo lleva 9 días limpio");
  });

  it("keeps every clean day in the total", () => {
    assert.equal(totalCleanDays(answers({ "2026-10-01": false, "2026-10-02": true, "2026-10-04": false })), 2);
  });

  it("counts days the whole group stayed clean", () => {
    const ana = { joinedDay: "2026-10-01", answers: answers({ "2026-10-01": false, "2026-10-02": false, "2026-10-03": false, "2026-10-04": false }) };
    const luis = { joinedDay: "2026-10-01", answers: answers({ "2026-10-01": true, "2026-10-02": false, "2026-10-03": false, "2026-10-04": false }) };
    assert.equal(groupStreak([ana, luis], "2026-10-04"), 3);
    // Someone who joined later counts from their first day.
    const beto = { joinedDay: "2026-10-04", answers: answers({ "2026-10-04": false }) };
    assert.equal(groupStreak([ana, luis, beto], "2026-10-04"), 3);
    // A missing answer ends it.
    const silent = { joinedDay: "2026-10-01", answers: answers({ "2026-10-02": false, "2026-10-04": false }) };
    assert.equal(groupStreak([ana, silent], "2026-10-04"), 1);
    assert.equal(groupStreak([], "2026-10-04"), 0);
  });

  it("prefers the nickname", () => {
    assert.equal(displayName({ name: "Jorge Quevedo", email: "j@x.com", nickname: " Coco " }), "Coco");
    assert.equal(displayName({ name: "Jorge Quevedo", email: "j@x.com", nickname: "" }), "Jorge");
  });
});
