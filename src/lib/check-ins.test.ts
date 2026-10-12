import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanStreak, dayReport, displayName, joinNames, reportMessage } from "./check-ins";

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
