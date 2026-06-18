import test from "node:test";
import assert from "node:assert/strict";
import { formatDuration, formatReport, toPublicJson } from "../src/format.js";

const report = {
  availableCount: 1,
  credits: [
    {
      title: "One free rate limit reset",
      status: "available",
      resetType: "codex_rate_limits",
      grantedAt: new Date("2026-06-12T00:00:00Z"),
      expiresAt: new Date("2026-06-14T02:30:00Z"),
    },
  ],
};

test("formatDuration formats days, hours, and minutes", () => {
  assert.equal(formatDuration(93_600_000), "1d 2h 0m");
  assert.equal(formatDuration(1_800_000), "30m");
});

test("formatReport includes reset count, time left, and warning", () => {
  const output = formatReport(report, {
    now: new Date("2026-06-13T02:30:00Z"),
    warnHours: 24,
  });

  assert.match(output, /Resets available: 1/);
  assert.match(output, /One free rate limit reset/);
  assert.match(output, /Time left: 1d 0h 0m/);
  assert.match(output, /WARNING: reset #1 expires within 24 hours/);
});

test("toPublicJson redacts auth details and emits stable fields", () => {
  const output = toPublicJson(report, {
    now: new Date("2026-06-13T02:30:00Z"),
    warnHours: 24,
  });

  assert.deepEqual(Object.keys(output).sort(), [
    "availableCount",
    "credits",
    "generatedAt",
    "warnHours",
  ]);
  assert.equal(output.credits[0].timeLeftSeconds, 86_400);
  assert.equal(JSON.stringify(output).includes("token"), false);
});
