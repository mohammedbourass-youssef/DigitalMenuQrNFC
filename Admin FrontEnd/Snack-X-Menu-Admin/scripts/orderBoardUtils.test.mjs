import assert from "node:assert/strict";
import test from "node:test";

import {
  COLUMN_ID_PREFIX,
  columnIdOf,
  columnIndexOfStatus,
  collectOrderIds,
  countAllOrders,
  filterColumns,
  findOrder,
  findOrderById,
  formatPrice,
  insertOrderInFirstColumn,
  isColumnId,
  mergeLiveOrders,
  moveOrderToColumn,
  orderMatchesQuery,
  reorderWithinColumn,
  resolveDropTarget,
  statusIdOfColumnId,
} from "../src/lib/orderBoardUtils.ts";

function line(id, name, quantity, totalPrice) {
  return { id, name, quantity, unitPrice: totalPrice / quantity, totalPrice };
}

function order(orderId, orderNumber, tableNumber, totalPrice, lines = []) {
  return { orderId, orderNumber, tableNumber, totalPrice, lines };
}

function column(statusId, statusName, totalOrders, orders) {
  return {
    statusId,
    statusName,
    statusColor: "#3B82F6",
    totalOrders,
    isSystem: false,
    orders,
  };
}

const a = order("a", 1, 4, 12.5);
const b = order("b", 2, 7, 30);
const c = order("c", 3, 4, 8.25);

/** Deliberately non-contiguous status ids to prove nothing indexes by position. */
function board() {
  return [column(2, "Preparing", 2, [a, b]), column(9, "Ready", 1, [c]), column(41, "Served", 0, [])];
}

test("column ids round-trip through the prefixed form", () => {
  assert.equal(columnIdOf(41), `${COLUMN_ID_PREFIX}41`);
  assert.equal(isColumnId("column-41"), true);
  assert.equal(isColumnId("41"), false);
  assert.equal(statusIdOfColumnId("column-41"), 41);
  assert.equal(columnIndexOfStatus(board(), 41), 2);
  assert.equal(columnIndexOfStatus(board(), 7), -1);
});

test("lookups find orders across columns without mutating the board", () => {
  const columns = board();
  assert.deepEqual(findOrder(columns, "b"), { columnIndex: 0, orderIndex: 1 });
  assert.deepEqual(findOrder(columns, "c"), { columnIndex: 1, orderIndex: 0 });
  assert.equal(findOrder(columns, "zz"), null);
  assert.equal(findOrderById(columns, "c").orderNumber, 3);
  assert.equal(findOrderById(columns, "zz"), null);
  assert.equal(countAllOrders(columns), 3);
});

test("cross-column move adjusts both totalOrders counts", () => {
  const columns = board();
  const next = moveOrderToColumn(columns, "a", 9, 0);

  assert.equal(next[0].totalOrders, 1);
  assert.equal(next[1].totalOrders, 2);
  assert.deepEqual(next[1].orders.map((o) => o.orderId), ["a", "c"]);
  assert.deepEqual(next[0].orders.map((o) => o.orderId), ["b"]);

  // Untouched columns keep their identity so memoized columns can bail out.
  assert.equal(next[2], columns[2]);
  // The input is never mutated.
  assert.equal(columns[0].totalOrders, 2);
  assert.equal(columns[0].orders.length, 2);
});

test("move appends when no index is given and clamps out-of-range indexes", () => {
  const columns = board();
  assert.deepEqual(
    moveOrderToColumn(columns, "a", 9).map((col) => col.orders.length),
    [1, 2, 0]
  );
  assert.deepEqual(
    moveOrderToColumn(columns, "a", 9, 99)[1].orders.map((o) => o.orderId),
    ["c", "a"]
  );
  assert.deepEqual(
    moveOrderToColumn(columns, "a", 9, -5)[1].orders.map((o) => o.orderId),
    ["a", "c"]
  );
});

test("same-column move never changes the status counts", () => {
  const columns = board();
  const next = moveOrderToColumn(columns, "a", 2, 1);

  assert.deepEqual(next[0].orders.map((o) => o.orderId), ["b", "a"]);
  assert.equal(next[0].totalOrders, columns[0].totalOrders);
  assert.equal(next[1], columns[1]);
});

test("no-op moves return the very same reference", () => {
  const columns = board();
  assert.equal(moveOrderToColumn(columns, "a", 2, 0), columns);
  assert.equal(moveOrderToColumn(columns, "zz", 9), columns);
  assert.equal(moveOrderToColumn(columns, "a", 7), columns);
  assert.equal(reorderWithinColumn(columns, "a", "a"), columns);
  assert.equal(reorderWithinColumn(columns, "a", "c"), columns);
});

test("reorderWithinColumn moves a card and leaves counts alone", () => {
  const columns = [column(2, "Preparing", 3, [a, b, c])];
  const next = reorderWithinColumn(columns, "a", "c");

  assert.deepEqual(next[0].orders.map((o) => o.orderId), ["b", "c", "a"]);
  assert.equal(next[0].totalOrders, 3);
  assert.deepEqual(columns[0].orders.map((o) => o.orderId), ["a", "b", "c"]);
});

test("resolveDropTarget maps cards to their column and columns to the tail", () => {
  const columns = board();
  assert.deepEqual(resolveDropTarget(columns, "c"), { statusId: 9, index: 0 });
  assert.deepEqual(resolveDropTarget(columns, "column-41"), { statusId: 41, index: 0 });
  assert.deepEqual(resolveDropTarget(columns, "column-9"), { statusId: 9, index: 1 });
  assert.equal(resolveDropTarget(columns, "column-7"), null);
  assert.equal(resolveDropTarget(columns, "zz"), null);
});

test("filterColumns keeps empty columns and the server counts", () => {
  const columns = [
    column(2, "Preparing", 2, [
      order("a", 1, 4, 12.5, [line("l1", "Tacos", 2, 12.5)]),
      order("b", 2, 7, 30, [line("l2", "Burger", 1, 30)]),
    ]),
    column(9, "Ready", 0, []),
  ];

  const filtered = filterColumns(columns, "tac");
  assert.deepEqual(filtered[0].orders.map((o) => o.orderId), ["a"]);
  assert.equal(filtered[0].totalOrders, 2, "count stays the real status count");
  assert.equal(filtered[1].orders.length, 0, "empty column remains a valid drop target");
  assert.equal(filtered[1], columns[1]);

  assert.deepEqual(filterColumns(columns, "4")[0].orders.map((o) => o.orderId), ["a"]);
  assert.deepEqual(filterColumns(columns, "7")[0].orders.map((o) => o.orderId), ["b"]);
  assert.deepEqual(filterColumns(columns, "burg")[0].orders.map((o) => o.orderId), ["b"]);
  assert.deepEqual(filterColumns(columns, "zzz")[0].orders, []);
  assert.equal(filterColumns(columns, "  "), columns);
  assert.equal(orderMatchesQuery(b, "  "), true);
  assert.equal(orderMatchesQuery(b, "nope"), false);
});

test("formatPrice always renders two decimals and never throws", () => {
  const usd = formatPrice(12.5, "en-US", "USD");
  assert.match(usd, /12\.50/);
  assert.match(formatPrice(8.2567, "en-US", "USD"), /8\.26/);
  assert.match(formatPrice(1234.5, "en-US", "MAD"), /1,234\.50/);
  // Unknown currency codes must degrade instead of throwing.
  assert.equal(formatPrice(5, "en-US", "NOT-A-CURRENCY"), "5.00 NOT-A-CURRENCY");
});

test("a live order lands on top of the first column and bumps its count", () => {
  const columns = board();
  const fresh = order("live-1", 4, 2, 18, [line("l9", "Soup", 1, 18)]);
  const next = insertOrderInFirstColumn(columns, fresh);

  // "First" comes from the board's own order, never from a status name.
  assert.deepEqual(next[0].orders.map((o) => o.orderId), ["live-1", "a", "b"]);
  assert.equal(next[0].totalOrders, 3);
  assert.equal(next[1], columns[1], "other columns keep their identity");
  assert.equal(columns[0].orders.length, 2, "input is not mutated");
  assert.equal(insertOrderInFirstColumn([], fresh).length, 0);
});

test("a live order already on the board is ignored", () => {
  const columns = board();
  const duplicate = { ...b, orderNumber: 99 };
  assert.equal(insertOrderInFirstColumn(columns, duplicate), columns, "same reference = no re-render");

  // Also when it sits in another column, not just the first one.
  assert.equal(insertOrderInFirstColumn(columns, c), columns);
  assert.equal(insertOrderInFirstColumn(columns, { ...a, totalPrice: 1 }), columns);
});

test("merging live orders keeps newest-first and de-duplicates", () => {
  const columns = [column(2, "Preparing", 1, [a])];
  const newest = order("live-2", 5, 1, 10);
  const older = order("live-1", 4, 1, 20);

  const next = mergeLiveOrders(columns, [newest, older]);

  assert.deepEqual(next[0].orders.map((o) => o.orderId), ["live-2", "live-1", "a"]);
  assert.equal(next[0].totalOrders, 3);
});

test("merging does not duplicate an order the REST list already returned", () => {
  const columns = [column(2, "Preparing", 2, [a, b])];
  const next = mergeLiveOrders(columns, [{ ...a, orderNumber: 77 }, c]);

  assert.deepEqual(next[0].orders.map((o) => o.orderId), ["c", "a", "b"]);
  assert.equal(next[0].totalOrders, 3, "only the genuinely new order bumps the count");
  assert.equal(mergeLiveOrders(columns, []), columns);
  assert.deepEqual([...collectOrderIds(columns)].sort(), ["a", "b"]);
});