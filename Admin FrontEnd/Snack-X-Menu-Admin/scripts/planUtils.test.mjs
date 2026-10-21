import assert from "node:assert/strict";
import test from "node:test";

import { getPlanStatus, parseUsage } from "../src/lib/planUtils.ts";

test("parseUsage accepts whitespace and compact used/total formats", () => {
  assert.deepEqual(parseUsage("3 / 10"), { used: 3, total: 10, percent: 30 });
  assert.deepEqual(parseUsage("3/10"), { used: 3, total: 10, percent: 30 });
});

test("parseUsage handles unlimited totals and malformed input", () => {
  assert.deepEqual(parseUsage("3 / Unlimited"), { used: 3, total: null, percent: null });
  assert.deepEqual(parseUsage("3 / ∞"), { used: 3, total: null, percent: null });
  assert.deepEqual(parseUsage("3 / null"), { used: 3, total: null, percent: null });
  assert.equal(Number.isNaN(parseUsage("unknown").used), true);
});

test("getPlanStatus handles free, missing, near, and past expiry dates", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  assert.equal(getPlanStatus(true, "2025-01-01T00:00:00Z", now), "active");
  assert.equal(getPlanStatus(false, null, now), "active");
  assert.equal(getPlanStatus(false, "2026-01-05T00:00:00Z", now), "expiringSoon");
  assert.equal(getPlanStatus(false, "2025-12-31T23:59:59Z", now), "expired");
});
