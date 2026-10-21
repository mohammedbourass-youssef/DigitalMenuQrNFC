import assert from "node:assert/strict";
import test from "node:test";

import { formatLimit, formatPlanPrice } from "../src/lib/planPricingUtils.ts";

test("formatLimit renders unlimited values and preserves regular limits", () => {
  assert.equal(formatLimit(-1, "Unlimited"), "Unlimited");
  assert.equal(formatLimit(5, "Unlimited"), "5");
  assert.equal(formatLimit(Number.NaN, "Unlimited"), "—");
});

test("formatPlanPrice uses the supplied currency and safely formats without one", () => {
  assert.match(formatPlanPrice(12, "USD", "en-US"), /\$12\.00/);
  assert.equal(formatPlanPrice(1234.5, undefined, "en-US"), "1,234.5");
  assert.equal(formatPlanPrice(Number.NaN, "USD", "en-US"), "—");
});

test("formatPlanPrice falls back to a plain amount for an unexpected currency code", () => {
  assert.equal(formatPlanPrice(12, "NOT-A-CURRENCY", "en-US"), "12");
});
