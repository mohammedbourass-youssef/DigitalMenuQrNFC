import assert from "node:assert/strict";
import test from "node:test";

import {
  idsInOrder,
  moveByOffset,
  renumber,
  sortByDisplayOrder,
} from "../src/lib/paymentMethodOrder.ts";

function method(id, displayOrder, extra = {}) {
  return {
    id,
    paymentMethodId: id,
    code: `C${id}`,
    systemName: `System ${id}`,
    displayName: null,
    label: `System ${id}`,
    color: "#000000",
    icon: "banknote",
    isEnabled: true,
    isDefault: false,
    displayOrder,
    ...extra,
  };
}

test("moveByOffset moves one step in both directions", () => {
  assert.deepEqual(moveByOffset(["a", "b", "c"], 2, -1), ["a", "c", "b"]);
  assert.deepEqual(moveByOffset(["a", "b", "c"], 0, 1), ["b", "a", "c"]);
});

test("moveByOffset clamps at the edges instead of wrapping", () => {
  assert.deepEqual(moveByOffset(["a", "b"], 0, -1), ["a", "b"]);
  assert.deepEqual(moveByOffset(["a", "b"], 1, 1), ["a", "b"]);
  assert.deepEqual(moveByOffset(["a", "b"], 5, -1), ["a", "b"]);
  assert.deepEqual(moveByOffset(["a", "b"], -1, 1), ["a", "b"]);
});

test("moveByOffset never mutates the source and keeps identities", () => {
  const rows = [method(1, 1), method(2, 2), method(3, 3)];
  const snapshot = [...rows];
  const next = moveByOffset(rows, 0, 1);

  assert.deepEqual(rows, snapshot, "source untouched");
  assert.notEqual(next, rows, "returns a new array");
  assert.equal(next[1], rows[0], "same object references, no needless re-render");
});

test("idsInOrder sends every id, which is what the reorder endpoint requires", () => {
  assert.deepEqual(idsInOrder([method(9, 1), method(4, 2), method(7, 3)]), [9, 4, 7]);
  assert.deepEqual(idsInOrder([]), []);
});

test("sortByDisplayOrder is stable and does not mutate the input", () => {
  const rows = [method(3, 3), method(1, 1), method(2, 2)];
  const sorted = sortByDisplayOrder(rows);
  assert.deepEqual(sorted.map((row) => row.id), [1, 2, 3]);
  assert.deepEqual(rows.map((row) => row.id), [3, 1, 2], "source untouched");
});

test("renumber makes displayOrder dense and 1-based", () => {
  const rows = [method(5, 40), method(6, 90), method(7, 120)];
  assert.deepEqual(renumber(rows).map((row) => row.displayOrder), [1, 2, 3]);
});