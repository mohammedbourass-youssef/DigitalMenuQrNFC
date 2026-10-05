import type { TenantPaymentMethod } from "@/types/paymentMethod";

/**
 * Moves one item by `offset` positions and returns a new array.
 * Out-of-range targets clamp to the ends, and a no-op returns the original
 * reference so callers can skip work. Used by the move up/down buttons, which
 * are the keyboard and touch alternative to dragging.
 */
export function moveByOffset<T>(items: readonly T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (index < 0 || index >= items.length) return [...items];
  if (target < 0 || target >= items.length) return [...items];
  if (target === index) return [...items];

  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

/** Every tenant method id in current order - the exact list the API wants. */
export function idsInOrder(methods: readonly TenantPaymentMethod[]): number[] {
  return methods.map((method) => method.id);
}

/** Stable sort by `displayOrder`, keeping the server order for ties. */
export function sortByDisplayOrder(methods: readonly TenantPaymentMethod[]): TenantPaymentMethod[] {
  return [...methods].sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Rows that are off, because the API always sends the whole list. */
export function renumber(methods: readonly TenantPaymentMethod[]): TenantPaymentMethod[] {
  return methods.map((method, index) => ({ ...method, displayOrder: index + 1 }));
}