import type { BoardOrderItem } from "@/types";

export type OrdersByStatus = Record<string, BoardOrderItem[]>;

export const STATUS_COUNT_BY =
  (map: OrdersByStatus) => (statusId: number) => map[String(statusId)]?.length ?? 0;

export function groupByStatus(orders: BoardOrderItem[]): OrdersByStatus {
  const map: OrdersByStatus = {};
  for (const order of orders) {
    const key = String(order.statusId);
    const bucket = map[key];
    if (bucket) bucket.push(order);
    else map[key] = [order];
  }
  return map;
}

export function flattenByStatus(map: OrdersByStatus): BoardOrderItem[] {
  return Object.values(map).flat();
}

export const statusKeyOfOrder = (order: BoardOrderItem) => String(order.statusId);

export function orderIndexIn(map: OrdersByStatus, statusKey: string, orderId: string): number {
  return map[statusKey]?.findIndex((o) => o.id === orderId) ?? -1;
}

export function cardAt(map: OrdersByStatus, statusKey: string, index: number): BoardOrderItem | null {
  return map[statusKey]?.[index] ?? null;
}

/** Copies the map so downstream state updates never mutate previous state. */
export function cloneBoard(map: OrdersByStatus): OrdersByStatus {
  const next: OrdersByStatus = {};
  for (const key of Object.keys(map)) next[key] = [...map[key]];
  return next;
}

/**
 * Moves `orderId` into `targetKey` at `targetIndex` (clamped).
 * Returns a new map. The order object is carried over intact.
 */
export function moveOrderInto(
  current: OrdersByStatus,
  orderId: string,
  targetKey: string,
  targetIndex: number
): { next: OrdersByStatus; moved: BoardOrderItem | null } {
  let moved: BoardOrderItem | null = null;
  const next: OrdersByStatus = {};

  for (const key of Object.keys(current)) {
    const bucket = current[key];
    const kept = bucket.filter((o) => o.id !== orderId);
    if (kept.length !== bucket.length && moved === null) {
      moved = bucket.find((o) => o.id === orderId) ?? null;
    }
    if (key === targetKey) continue;
    next[key] = kept;
  }

  const source = (current[targetKey] ?? []).filter((o) => o.id !== orderId);
  if (moved === null) moved = source.find((o) => o.id === orderId) ?? null;
  const carried =
    moved && String(moved.statusId) !== targetKey ? { ...moved, statusId: Number(targetKey) } : moved;
  const clamped = Math.max(0, Math.min(targetIndex, source.length));
  const target = [...source];
  if (carried) target.splice(clamped, 0, carried);
  next[targetKey] = target;

  return { next, moved };
}

/** Moves an order to another status. Default index 0 inserts at the top. */
export function moveOrderToStatus(
  current: OrdersByStatus,
  orderId: string,
  targetKey: string,
  targetIndex = 0
): OrdersByStatus {
  const { next } = moveOrderInto(current, orderId, targetKey, targetIndex);
  return next;
}

/** Moves every order of `fromKey` into `targetKey` (appended after existing). */
export function moveStatusOrders(
  current: OrdersByStatus,
  fromKey: string,
  targetKey: string
): OrdersByStatus {
  const source = current[fromKey] ?? [];
  const target = current[targetKey] ?? [];
  const next = { ...current };
  delete next[fromKey];
  next[targetKey] = [...target, ...source];
  return next;
}

/** Removes a status key only when it holds no orders. */
export function dropEmptyStatus(current: OrdersByStatus, statusKey: string): OrdersByStatus {
  const next = { ...current };
  delete next[statusKey];
  return next;
}

/** Finds the bucket key that holds `orderId`. */
export function findStatusKey(map: OrdersByStatus, orderId: string): string | null {
  for (const key of Object.keys(map)) {
    if ((map[key] ?? []).some((o) => o.id === orderId)) return key;
  }
  return null;
}

/** Reorders `orderId` to the position of `overId` within the same bucket. */
export function arrayMoveInMap(map: OrdersByStatus, orderId: string, overId: string): OrdersByStatus {
  const key = findStatusKey(map, orderId);
  if (!key) return map;
  const bucket = map[key] ?? [];
  const from = bucket.findIndex((o) => o.id === orderId);
  const to = bucket.findIndex((o) => o.id === overId);
  if (from === -1 || to === -1 || from === to) return map;
  const next = [...bucket];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return { ...map, [key]: next };
}

export const isColumnOverId = (id: string) => id.startsWith("column-");
export const columnStatusKey = (columnId: string) => columnId.slice("column-".length);
export const columnIdOf = (statusKey: string) => `column-${statusKey}`;

export interface BoardFilters {
  query: string;
}

/** Client-side filter matching order number, table name and item names. */
export function filterOrders(orders: BoardOrderItem[], query: string): BoardOrderItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return orders;
  return orders.filter((order) => {
    if (String(order.orderNumber).includes(q)) return true;
    if (order.tableName && order.tableName.toLowerCase().includes(q)) return true;
    return order.items.some((line) => line.name.toLowerCase().includes(q));
  });
}

/** Next order number for the tenant-scoped mock collection. */
export function nextOrderNumber(orders: BoardOrderItem[]): number {
  const max = orders.reduce((acc, order) => Math.max(acc, order.orderNumber), 0);
  return max + 1;
}

export function formatMoney(amount: number, language: string, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(language, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: currencyCode === "JPY" || currencyCode === "KRW" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

export function formatTime(iso: string, language: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(language, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
}