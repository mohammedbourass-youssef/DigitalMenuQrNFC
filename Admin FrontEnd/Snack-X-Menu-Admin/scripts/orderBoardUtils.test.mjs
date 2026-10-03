import { test } from "node:test";
import assert from "node:assert/strict";

import { moveOrderInto, arrayMoveInMap } from "../src/lib/orderBoardUtils.ts";

function order(id, statusId) {
  return { id, statusId, orderNumber: 1, tableId: null, tableName: null, total: 1, currencyCode: "MAD", createdAt: "", items: [] };
}

test("moving a card into another column updates its statusId so the move survives a reload", () => {
  const map = { "1": [order("a", 1)], "2": [order("b", 2)] };
  const { next } = moveOrderInto(map, "a", "2", 0);
  assert.equal(next["2"][0].statusId, 2);
  assert.equal(next["1"].length, 0);
});

test("moving a card within the same column keeps its statusId unchanged", () => {
  const map = { "1": [order("a", 1), order("b", 1)] };
  const { next } = moveOrderInto(map, "a", "1", 1);
  assert.equal(next["1"][0].statusId, 1);
  assert.equal(next["1"][0].id, "b");
  assert.equal(next["1"][1].id, "a");
});

test("reordering within a column via arrayMoveInMap keeps statusId unchanged", () => {
  const map = { "1": [order("a", 1), order("b", 1), order("c", 1)] };
  const next = arrayMoveInMap(map, "a", "c");
  assert.deepEqual(
    next["1"].map((o) => o.id),
    ["b", "c", "a"]
  );
  assert.ok(next["1"].every((o) => o.statusId === 1));
});

test("moving into an empty column targets index 0", () => {
  const map = { "1": [order("a", 1)], "2": [] };
  const { next } = moveOrderInto(map, "a", "2", 0);
  assert.deepEqual(next["2"].map((o) => o.id), ["a"]);
  assert.equal(next["2"][0].statusId, 2);
});