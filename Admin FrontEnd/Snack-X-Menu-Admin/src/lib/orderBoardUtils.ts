import type { OrderStatusColumnDto, OrderSummaryDto } from "@/types/orders";

/* ------------------------------------------------------------------ *
 * Droppable ids
 * ------------------------------------------------------------------ */

export const COLUMN_ID_PREFIX = "column-";

/** Droppable id for a whole column. Uses `statusId`, never an array index. */
export const columnIdOf = (statusId: number): string => `${COLUMN_ID_PREFIX}${statusId}`;

export const isColumnId = (id: string): boolean => id.startsWith(COLUMN_ID_PREFIX);

export const statusIdOfColumnId = (id: string): number =>
  Number(id.slice(COLUMN_ID_PREFIX.length));

/* ------------------------------------------------------------------ *
 * Lookups
 * ------------------------------------------------------------------ */

export interface OrderLocation {
  columnIndex: number;
  orderIndex: number;
}

export function findOrder(
  columns: OrderStatusColumnDto[],
  orderId: string
): OrderLocation | null {
  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const orderIndex = columns[columnIndex].orders.findIndex((o) => o.orderId === orderId);
    if (orderIndex !== -1) return { columnIndex, orderIndex };
  }
  return null;
}

export function findOrderById(
  columns: OrderStatusColumnDto[],
  orderId: string
): OrderSummaryDto | null {
  const location = findOrder(columns, orderId);
  if (!location) return null;
  return columns[location.columnIndex].orders[location.orderIndex] ?? null;
}

export function columnIndexOfStatus(
  columns: OrderStatusColumnDto[],
  statusId: number
): number {
  return columns.findIndex((column) => column.statusId === statusId);
}

export function countAllOrders(columns: OrderStatusColumnDto[]): number {
  return columns.reduce((sum, column) => sum + column.orders.length, 0);
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

/* ------------------------------------------------------------------ *
 * Mutations (pure: always return a new array, never mutate the input)
 * ------------------------------------------------------------------ */

/**
 * Moves `orderId` into `toStatusId` at `toIndex` (appends when omitted).
 * Crossing columns adjusts `totalOrders` by -1 on the source and +1 on the
 * target. Returns the very same array reference when the move is a no-op, so
 * memoized columns can bail out of re-rendering.
 */
export function moveOrderToColumn(
  columns: OrderStatusColumnDto[],
  orderId: string,
  toStatusId: number,
  toIndex?: number
): OrderStatusColumnDto[] {
  const from = findOrder(columns, orderId);
  const targetIndex = columnIndexOfStatus(columns, toStatusId);
  if (!from || targetIndex === -1) return columns;

  const order = columns[from.columnIndex].orders[from.orderIndex];
  const sameColumn = from.columnIndex === targetIndex;

  const without = columns.map((column, index) =>
    index === from.columnIndex
      ? { ...column, orders: column.orders.filter((o) => o.orderId !== orderId) }
      : column
  );

  const targetOrders = without[targetIndex].orders;
  const insertAt = clamp(toIndex ?? targetOrders.length, 0, targetOrders.length);

  // Already sitting exactly there: keep the same reference so memoized
  // columns and cards skip re-rendering entirely.
  if (sameColumn && insertAt === from.orderIndex) return columns;

  const orders = [...targetOrders];
  orders.splice(insertAt, 0, order);

  const next = [...without];
  next[targetIndex] = { ...without[targetIndex], orders };

  if (!sameColumn) {
    next[from.columnIndex] = {
      ...without[from.columnIndex],
      totalOrders: Math.max(0, without[from.columnIndex].totalOrders - 1),
    };
    next[targetIndex] = {
      ...next[targetIndex],
      totalOrders: next[targetIndex].totalOrders + 1,
    };
  }

  return next;
}

/** Reorders an order inside its own column. Counts are untouched. */
export function reorderWithinColumn(
  columns: OrderStatusColumnDto[],
  orderId: string,
  overOrderId: string
): OrderStatusColumnDto[] {
  if (orderId === overOrderId) return columns;

  const location = findOrder(columns, orderId);
  if (!location) return columns;

  const column = columns[location.columnIndex];
  const from = location.orderIndex;
  const to = column.orders.findIndex((o) => o.orderId === overOrderId);
  if (to === -1 || to === from) return columns;

  const orders = [...column.orders];
  const [moved] = orders.splice(from, 1);
  orders.splice(to, 0, moved);

  const next = [...columns];
  next[location.columnIndex] = { ...column, orders };
  return next;
}

/** Column + index a drop on `overId` should target. */
export function resolveDropTarget(
  columns: OrderStatusColumnDto[],
  overId: string
): { statusId: number; index: number } | null {
  if (isColumnId(overId)) {
    const statusId = statusIdOfColumnId(overId);
    const index = columnIndexOfStatus(columns, statusId);
    if (index === -1) return null;
    return { statusId, index: columns[index].orders.length };
  }

  const over = findOrder(columns, overId);
  if (!over) return null;
  return {
    statusId: columns[over.columnIndex].statusId,
    index: over.orderIndex,
  };
}

/* ------------------------------------------------------------------ *
 * Live orders (SignalR `NewOrderReceived`)
 * ------------------------------------------------------------------ */

/**
 * Inserts a brand-new order at the TOP of the first status column, which is
 * where the backend puts a freshly created order. The first column comes from
 * the board's own status configuration, never from a hardcoded name.
 *
 * Returns the very same array reference when the order is already on the board
 * (the hub event and the REST list can both report it) or when the board has no
 * column yet, so callers can bail out of re-rendering.
 */
export function insertOrderInFirstColumn(
  columns: OrderStatusColumnDto[],
  order: OrderSummaryDto
): OrderStatusColumnDto[] {
  if (columns.length === 0) return columns;
  if (findOrder(columns, order.orderId)) return columns;

  const next = [...columns];
  const first = columns[0];
  next[0] = {
    ...first,
    totalOrders: first.totalOrders + 1,
    orders: [order, ...first.orders],
  };
  return next;
}

/**
 * Re-applies orders that arrived over the hub but were missing from a REST
 * response, because that list was fetched before they were created.
 *
 * De-duplicated by `orderId`. `liveOrders` is expected newest-first (the order
 * the hook stores them in) and that order is preserved in the column.
 */
export function mergeLiveOrders(
  columns: OrderStatusColumnDto[],
  liveOrders: OrderSummaryDto[]
): OrderStatusColumnDto[] {
  let next = columns;
  // Back to front, so each insert lands under the previous one.
  for (let index = liveOrders.length - 1; index >= 0; index -= 1) {
    next = insertOrderInFirstColumn(next, liveOrders[index]);
  }
  return next;
}

/** Ids of every order currently on the board, across all columns. */
export function collectOrderIds(columns: OrderStatusColumnDto[]): Set<string> {
  const ids = new Set<string>();
  for (const column of columns) {
    for (const order of column.orders) ids.add(order.orderId);
  }
  return ids;
}

/* ------------------------------------------------------------------ *
 * Client-side filtering (never triggers a request)
 * ------------------------------------------------------------------ */

export function orderMatchesQuery(order: OrderSummaryDto, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    String(order.orderNumber).includes(q) ||
    String(order.tableNumber).includes(q) ||
    order.lines.some((line) => line.name.toLowerCase().includes(q))
  );
}

/**
 * Filters the visible cards. Every column is kept (so empty columns remain
 * valid drop targets) and `totalOrders` keeps showing the real status count.
 */
export function filterColumns(
  columns: OrderStatusColumnDto[],
  query: string
): OrderStatusColumnDto[] {
  if (query.trim() === "") return columns;
  return columns.map((column) => {
    const orders = column.orders.filter((order) => orderMatchesQuery(order, query));
    // Columns the search does not touch keep their reference so React.memo
    // can skip them while typing.
    if (orders.length === column.orders.length) return column;
    return { ...column, orders };
  });
}

/* ------------------------------------------------------------------ *
 * Formatting (display only - never mutates stored values)
 * ------------------------------------------------------------------ */

/** Prices arrive with many decimals; always render exactly two. */
export function formatPrice(amount: number, language: string, currency: string): string {
  try {
    return new Intl.NumberFormat(language, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatClock(timestamp: number, language: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit" }).format(date);
  } catch {
    return "";
  }
}