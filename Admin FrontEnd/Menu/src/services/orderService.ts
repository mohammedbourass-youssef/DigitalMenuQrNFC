import { apiFetch } from '../lib/api';
import { ApiError } from '../lib/errors';
import { isSupportedCurrency, type CurrencyCode, type LanguageCode } from '../lib/constants';
import { getLangCode } from '../lib/lang';
import * as orderMock from '../lib/orderMock';
import { mapOrderTracking } from '../lib/orderTracking';
import type { OrderTrackingPayload } from '../lib/orderTracking';
import type { OrderTrackingView } from '../types/order';
import type { LocalizedString } from '../types';
import type { CreateOrderRequest, OrderItemRequest } from '../types/order';

/**
 * Singular `Order`, capital O — this is the route the backend registers.
 * `/api/tenant/orders` (plural) is a *different* path and 404s before the action
 * ever runs. ASP.NET routing is case-insensitive, so the casing here is
 * cosmetic, but the missing `s` is not.
 */
const PATH = '/api/tenant/Order';

/** Matches the backend's `decimal` precision, which is stored as decimal(18,2). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface SubmitOrderInput {
  items: OrderItemRequest[];
  tableNumber: number;
  currency: CurrencyCode;
  lang: LanguageCode;
  notes?: string | null;
}

/**
 * Places the order.
 *
 * Prices are recalculated server-side from the tenant's own menu rows, so the
 * unit prices sent here are only used to satisfy the DTO's `[Required]`
 * `TotalPrice`/`UnitPrice` fields — the authoritative figures come back on the
 * order, never from the client cart.
 *
 * `retry: false` is deliberate: the wrapper's automatic retry is GET-only, and a
 * retried POST here would be a second order. Double submission is prevented in
 * the UI by disabling the confirm button while this is in flight.
 *
 * The 200 body is the **same** tracking payload the refresh endpoint returns
 * (`orderId`, `orderNumber`, `currentStatus`, `steps`, `isFinal`,
 * `canAddItems`), so it goes through the same normaliser as every later poll.
 * Reading it separately is how this used to break: the create response spells
 * the id `OrderId`, and the status block is an `OrderStatusStepDto`
 * (`StatusId`/`StatusName`/`StatusColor`), not the older
 * `{ statusID, name, color }` summary.
 */
export async function submitOrder(input: SubmitOrderInput): Promise<OrderTrackingView> {
  if (input.items.length === 0) {
    throw new ApiError(422, 'The order must contain at least one item.');
  }
  if (!Number.isInteger(input.tableNumber) || input.tableNumber <= 0) {
    throw new ApiError(422, 'A valid table number is required.');
  }
  // The backend builds a rate table keyed by this value and throws when a
  // currency has no rate, so an unsupported code surfaces as an opaque 500.
  if (!isSupportedCurrency(input.currency)) {
    throw new ApiError(422, `Unsupported currency: ${input.currency}`);
  }

  const total = round2(input.items.reduce((sum, item) => sum + item.TotalPrice, 0));

  const body: CreateOrderRequest = {
    // Legacy field: the backend still reads `lang` from the body. It now also
    // receives X-Lang on the request. Safe to drop once the header is enough.
    lang: getLangCode(input.lang),
    TableNumber: input.tableNumber,
    DefaultCurrency: input.currency,
    TotalPrice: total,
    Notes: input.notes ?? null,
    orderItems: input.items.map((item) => ({
      Id: item.Id,
      Quantity: item.Quantity,
      UnitPrice: round2(item.UnitPrice),
      TotalPrice: round2(item.TotalPrice),
    })),
  };

  const raw = await apiFetch<OrderTrackingPayload>(PATH, {
    method: 'POST',
    body,
    retry: false,
  });

  const tracking = mapOrderTracking(raw);
  // No id means the order cannot be tracked or re-fetched, so treating this as
  // a success would strand the customer with a cart that was never cleared and
  // a confirmation screen pointing at nothing. The kitchen would still cook the
  // order, which is exactly why this must not be swallowed.
  if (!tracking?.orderId) {
    throw new ApiError(502, 'The order response did not contain an order id.');
  }

  return tracking;
}

/** Re-exported so callers need only import from the service. */
export type { CreateOrderRequest, OrderItemRequest };

/* -------------------------------------------------------------------------- */
/* Read / update order                                                         */
/*                                                                             */
/* The refresh endpoint (GET .../Order/{id}/Line) is REAL. Only the developer   */
/* mock is behind a flag now, and it is OFF by default, so the shipped app      */
/* talks to the backend for every status the customer sees.                     */
/* -------------------------------------------------------------------------- */

/**
 * Dev-only mock for the tracking refresh, kept so the UI can be driven without a
 * running kitchen backend.
 *
 * Defaults to **off**. Opt in with `VITE_MOCK_ORDER_LINE=true`; the legacy
 * `VITE_ORDER_TRACKING_MOCK` name is still honoured so older `.env` files keep
 * working.
 */
const USE_MOCK = import.meta.env.VITE_MOCK_ORDER_LINE === 'true'
  || (import.meta.env.VITE_MOCK_ORDER_LINE === undefined
    && import.meta.env.VITE_ORDER_TRACKING_MOCK === 'true');

if (USE_MOCK) {
  // Dev-only hooks for driving the mock into a final status while testing:
  // `window.__orderMock.force('Served')`.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__orderMock = orderMock.__orderMock;
  }
}

/**
 * Registers a just-created order with the mock backend.
 *
 * Only called when the mock is active; `submitOrder` itself is always real, so
 * the order genuinely exists server-side and this only records it locally for
 * the mocked read endpoints.
 */
export function trackCreatedOrder(
  request: CreateOrderRequest,
  orderId: string,
  names?: Record<string, LocalizedString>,
): void {
  if (!USE_MOCK) return;
  orderMock.mockTrackCreatedOrder(request, orderId, names);
}

/**
 * Refresh path for every status the customer sees, on every screen.
 *
 * This is the single source of truth: the tracking page, the home tracking bar
 * and the icon all read the value this produces. `no-store` matters because a
 * 10-second poll served from the HTTP cache would show a status the kitchen has
 * already moved past.
 */
export function getOrderTracking(
  orderId: string,
  signal?: AbortSignal,
): Promise<OrderTrackingPayload> {
  if (USE_MOCK) return orderMock.mockFetchOrder(orderId);
  return apiFetch<OrderTrackingPayload>(`${PATH}/${encodeURIComponent(orderId)}/Line`, {
    cache: 'no-store',
    retry: false,
    // Retrying here would double the request rate on a flaky connection, and
    // polling already re-requests on its own schedule; let the poller decide.
    signal,
  });
}

/**
 * True when the server said this order does not exist for this session.
 *
 * Re-exported from the pure classifier so the store can import it without
 * reaching into the service layer for a single boolean.
 */
export { isOrderNotFound, classifyTrackingError } from '../lib/orderTracking';

/**
 * Adds items to the existing order.
 *
 * Rejects with 409 when the order has reached a final status — the rule comes
 * from the server, never from a hardcoded status id. The caller follows this with
 * one quiet `refreshInBackground()` so every screen shows the server's
 * recalculated state.
 */
export function addItemsToOrder(
  orderId: string,
  items: OrderItemRequest[],
  names?: Record<string, LocalizedString>,
): Promise<OrderTrackingPayload> {
  if (USE_MOCK) {
    return orderMock.mockAddItems(
      orderId,
      items.map((item) => ({
        Id: item.Id,
        Quantity: item.Quantity,
        UnitPrice: item.UnitPrice,
        TotalPrice: item.TotalPrice,
      })),
      names,
    );
  }
  return apiFetch<OrderTrackingPayload>(`${PATH}/${encodeURIComponent(orderId)}/items`, {
    method: 'POST',
    body: { orderItems: items },
    retry: false,
    cache: 'no-store',
  });
}