import { normalizeCurrency, type CurrencyCode } from './constants';
import { storageGet, storageRemove, storageSet } from './storage';
import { tenantScopedKey } from './tenant';
import type { ActiveOrder } from '../types/order';

/**
 * The customer's in-flight order id, persisted so a page refresh (or the tab
 * being closed and reopened mid-meal) still lands them back on the tracking
 * screen.
 *
 * Scoped per restaurant with `tenantScopedKey`, the same guard the cart and the
 * session token use, so a shared device cannot leak one restaurant's order into
 * another's menu.
 *
 * The stored record is only a *snapshot* for first paint. The authoritative data
 * always comes from `useSessionOrder()` refetching the order.
 */
const ACTIVE_ORDER_KEY = tenantScopedKey('activeOrder');

/**
 * Reads the stored order id.
 *
 * Survives a refresh but not a cleared localStorage: there is no backend
 * endpoint that resolves "this session's order", because `Order.SessionId` is
 * stored server-side but never exposed. See `useSessionOrder()` for the recovery
 * seam where that endpoint would go.
 */
export function loadActiveOrder(): ActiveOrder | null {
  const stored = storageGet<Partial<ActiveOrder> | null>(ACTIVE_ORDER_KEY, null);
  if (!stored || typeof stored.orderId !== 'string' || !stored.orderId) return null;
  return {
    orderId: stored.orderId,
    tableNumber: typeof stored.tableNumber === 'number' ? stored.tableNumber : 0,
    currency: (stored.currency ? normalizeCurrency(stored.currency) : 'MAD') as CurrencyCode,
    statusId: typeof stored.statusId === 'number' ? stored.statusId : 0,
    statusCode: typeof stored.statusCode === 'string' ? stored.statusCode : '',
    statusName: typeof stored.statusName === 'string' ? stored.statusName : '',
    statusColor: typeof stored.statusColor === 'string' ? stored.statusColor : '',
    createdAt: typeof stored.createdAt === 'number' ? stored.createdAt : Date.now(),
  };
}

export function saveActiveOrder(order: ActiveOrder): void {
  storageSet(ACTIVE_ORDER_KEY, order);
}

/**
 * Drops the stored order.
 *
 * Only ever called when the backend says the order is genuinely gone (404/403)
 * — a final status must never clear this, because the customer still needs to
 * reach the tracking page.
 */
export function clearActiveOrder(): void {
  storageRemove(ACTIVE_ORDER_KEY);
}