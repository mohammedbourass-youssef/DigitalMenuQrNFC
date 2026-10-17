import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getOrderHistoryErrorMessage,
  getOrderHistoryRange,
  isUnauthorizedOrderHistoryError,
} from "../src/lib/orderHistoryUtils.ts";

test("empty result displays zero range", () => {
  assert.deepEqual(getOrderHistoryRange(1, 20, 0, 0), { from: 0, to: 0 });
});

test("single page range uses returned item count", () => {
  assert.deepEqual(getOrderHistoryRange(1, 20, 8, 8), { from: 1, to: 8 });
});

test("middle page range uses the server page and page size", () => {
  assert.deepEqual(getOrderHistoryRange(2, 20, 20, 134), { from: 21, to: 40 });
});

test("last page range ends at the last returned item", () => {
  assert.deepEqual(getOrderHistoryRange(7, 20, 14, 134), { from: 121, to: 134 });
});

test("paged history labels exist in every supported locale", () => {
  for (const language of ["ar", "de", "en", "es", "fr", "it", "ja", "ko", "zh"]) {
    const locale = JSON.parse(readFileSync(`src/i18n/locales/${language}.json`, "utf8"));
    assert.deepEqual(Object.keys(locale.orders.history).sort(), [
      "noOrdersYet",
      "ofTotal",
      "pageOf",
      "results",
    ]);
    assert.ok(locale.orders.history.results.length > 0);
    assert.ok(locale.orders.history.noOrdersYet.length > 0);
  }
});

test("API errors keep the server message available to the error state", () => {
  const error = Object.assign(new Error("Request failed"), {
    isAxiosError: true,
    response: { status: 500, data: { error: "Order history unavailable" } },
  });
  assert.equal(getOrderHistoryErrorMessage(error), "Order history unavailable");
  assert.equal(isUnauthorizedOrderHistoryError(error), false);
});

test("401 API errors are identified for the existing login redirect", () => {
  const error = Object.assign(new Error("Unauthorized"), {
    isAxiosError: true,
    response: { status: 401, data: { error: "Invalid token" } },
  });
  assert.equal(isUnauthorizedOrderHistoryError(error), true);
});
