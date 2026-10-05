import assert from "node:assert/strict";
import test from "node:test";

import {
  amountDue,
  defaultPaymentMethodId,
  parseAmount,
  toAmountInputValue,
  toOrderPaymentInfo,
  validateAmount,
} from "../src/lib/orderPaymentUtils.ts";

test("amountDue never goes negative, whatever the float noise", () => {
  assert.equal(amountDue(100, 0), 100);
  assert.equal(amountDue(100, 40), 60);
  assert.equal(amountDue(100, 100), 0);
  assert.equal(amountDue(150, 149.99999999999997), 0);
  assert.equal(amountDue(100, 120), 0);
});

test("parseAmount accepts both decimal separators and rejects half-typed input", () => {
  assert.equal(parseAmount("150"), 150);
  assert.equal(parseAmount("150,50"), 150.5);
  assert.equal(parseAmount(" 12.75 "), 12.75);
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount("   "), null);
  assert.equal(parseAmount("-"), null);
  assert.equal(parseAmount("abc"), null);
});

test("validateAmount rejects empty, non-positive and over-due amounts", () => {
  assert.equal(validateAmount("150", 150), null);
  assert.equal(validateAmount("150,00", 150), null, "must survive float noise");
  assert.equal(validateAmount("150.01", 150), "tooHigh");
  assert.equal(validateAmount("", 150), "required");
  assert.equal(validateAmount("0", 150), "required");
  assert.equal(validateAmount("-10", 150), "required");
});

test("toAmountInputValue is fixed-point, never exponential", () => {
  assert.equal(toAmountInputValue(150), "150.00");
  assert.equal(toAmountInputValue(150.5), "150.50");
  assert.equal(toAmountInputValue(0.0000001), "0.00");
});

test("defaultPaymentMethodId prefers isDefault, then the first option", () => {
  assert.equal(defaultPaymentMethodId([]), null);
  assert.equal(defaultPaymentMethodId([{ id: 1 }, { id: 2 }]), 1);
  assert.equal(defaultPaymentMethodId([{ id: 1 }, { id: 2, isDefault: true }]), 2);
});

const boardOrder = (overrides = {}) => ({
  orderId: "3f1b0a6e-0000-4000-8000-000000000001",
  orderNumber: 1204,
  tableNumber: 7,
  totalPrice: 432.5,
  isPaid: false,
  lines: [
    { id: "l1", name: "Tajine Poulet", quantity: 2, unitPrice: 150, totalPrice: 300 },
    { id: "l2", name: "Mint tea", quantity: 5, unitPrice: 26.5, totalPrice: 132.5 },
  ],
  ...overrides,
});

test("toOrderPaymentInfo reports only what the order actually contains", () => {
  const info = toOrderPaymentInfo(boardOrder(), "MAD");

  assert.equal(info.orderId, "3f1b0a6e-0000-4000-8000-000000000001");
  assert.equal(info.orderNumber, 1204);
  assert.equal(info.tableNumber, 7);
  assert.equal(info.total, 432.5);
  assert.equal(info.currencyCode, "MAD");
  assert.equal(info.paidAmount, 0);
  assert.equal(info.paymentStatus, "Unpaid");
  assert.equal(amountDue(info.total, info.paidAmount), 432.5);
});

test("a paid order reports its full total as paid, with nothing to owe", () => {
  const info = toOrderPaymentInfo(boardOrder({ isPaid: true }), "MAD");

  assert.equal(info.paymentStatus, "Paid");
  assert.equal(info.paidAmount, 432.5);
  assert.equal(amountDue(info.total, info.paidAmount), 0);
});

test("the lines are copied through, never re-priced", () => {
  const info = toOrderPaymentInfo(boardOrder(), "MAD");

  assert.deepEqual(info.items, [
    { id: "l1", name: "Tajine Poulet", quantity: 2, unitPrice: 150, lineTotal: 300 },
    { id: "l2", name: "Mint tea", quantity: 5, unitPrice: 26.5, lineTotal: 132.5 },
  ]);
});

test("the projection invents nothing: no date, no notes, no history", () => {
  const info = toOrderPaymentInfo(boardOrder(), "MAD");

  assert.deepEqual(Object.keys(info).sort(), [
    "currencyCode",
    "items",
    "orderId",
    "orderNumber",
    "paidAmount",
    "paymentStatus",
    "tableNumber",
    "total",
  ]);
  for (const item of info.items) {
    assert.deepEqual(Object.keys(item).sort(), [
      "id",
      "lineTotal",
      "name",
      "quantity",
      "unitPrice",
    ]);
  }
});

test("an order with no lines renders an empty table, not invented dishes", () => {
  const info = toOrderPaymentInfo(boardOrder({ lines: [], totalPrice: 0 }), "MAD");

  assert.deepEqual(info.items, []);
  assert.equal(info.total, 0);
  // A zero total must not be mistaken for a settled bill: `isPaid` rules.
  assert.equal(info.paymentStatus, "Unpaid");
  assert.equal(info.paidAmount, 0);
});