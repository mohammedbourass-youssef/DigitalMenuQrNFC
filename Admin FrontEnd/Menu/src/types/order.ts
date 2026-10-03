import type { CurrencyCode, LanguageCode } from '../lib/constants';
import type { LocalizedString } from '../types';

/**
 * Customer-facing order DTOs.
 *
 * Field names here are the *exact* casing the ASP.NET backend sends and
 * expects, not the camelCase used elsewhere in this app. System.Text.Json's
 * default naming policy only lowercases the first letter, so a C# `TableNumber`
 * arrives as `tableNumber` while `OrderId` also arrives as `orderId` — the
 * casing is decided by the C# property name, and it is not always what a reader
 * would guess. Anything ambiguous is normalised in `lib/orderTracking.ts` rather
 * than guessed at the call site.
 */

/** One line of a create-order request. Mirrors the backend's `OrderItemDto`. */
export interface OrderItemRequest {
  /** Guid of the menu item, as a string. */
  Id: string;
  Quantity: number;
  UnitPrice: number;
  TotalPrice: number;
}

/**
 * Body of `POST /api/tenant/Order`. Mirrors the backend's `OrderRequestDTO`.
 *
 * `TotalPrice` is `[Required]` on the DTO and has no default, so it must be sent
 * even though the server recalculates every price from its own menu prices and
 * ignores the client's figure for the stored total.
 */
export interface CreateOrderRequest {
  /** Drives the localised `CurrentStatus.Name` in the response. */
  lang: LanguageCode;
  TableNumber: number;
  DefaultCurrency: CurrencyCode;
  TotalPrice: number;
  Notes?: string | null;
  orderItems: OrderItemRequest[];
}

/* -------------------------------------------------------------------------- */
/* Order read model                                                            */
/*                                                                             */
/* The read side is driven by the tracking DTO below, returned identically by    */
/* `POST /api/tenant/Order` and `GET .../Order/{id}/Line`. It carries no line     */
/* items or totals, so anything needing those still comes from the mock or a     */
/* future richer endpoint — see `lib/orderMock.ts`.                              */
/* -------------------------------------------------------------------------- */

/** A line on the order as the server priced it. */
export interface OrderItemView {
  id: string;
  /**
   * Localised item name snapshot.
   *
   * NOTE: the real create endpoint currently writes `NameSnapshot = ""`
   * (`tenantsController.cs:355`), so a future real get-order must join the
   * menu item to return names. The mock supplies real names.
   */
  name: LocalizedString;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/** Current status, as returned on the order itself. */
export interface OrderStatusView {
  id: number;
  /** Stable machine code (`New`, `Preparing`, ...). Preferred for icon mapping. */
  code: string;
  name: LocalizedString;
  /** Hex colour from the API. Never hardcode a status colour in the UI. */
  color: string;
  /** Whether this status is terminal — stops polling, blocks adding items. */
  isFinal: boolean;
}

/** One entry of the status timeline. */
export interface OrderHistoryEntry {
  statusId: number;
  statusCode: string;
  statusName: LocalizedString;
  color: string;
  /** ISO timestamp of when the order entered this status. */
  at: string;
}

/**
 * Full order as the customer sees it.
 *
 * Prices here are the **server's** figures, recalculated on the backend. The UI
 * must never sum the client cart to display an order total.
 */
export interface OrderResponse {
  orderId: string;
  /** Human-facing order number shown to staff and customers. */
  orderNumber: number;
  tableNumber: number;
  /** ISO timestamp. */
  createdAt: string;
  currencyCode: CurrencyCode;
  subtotal: number;
  total: number;
  items: OrderItemView[];
  currentStatus: OrderStatusView;
  statusHistory: OrderHistoryEntry[];
}

/**
 * An entry from the statuses endpoint, used to build the stepper timeline.
 *
 * Mirrors the backend's `OrderStatusDto`
 * (`id, code, name, color, displayOrder, isFinal, isSystem`) — `name` is
 * localised per the `lang` query parameter.
 */
export interface OrderStatusOption {
  id: number;
  code: string;
  name: LocalizedString;
  color: string | null;
  /** Position in the timeline. The stepper sorts on this, not on `id`. */
  displayOrder: number;
  isFinal: boolean;
  isSystem: boolean;
}

/**
 * An order the customer has placed and is currently tracking.
 *
 * This is the *persisted* snapshot — small on purpose: it only exists so the
 * status bar can paint something before the first fetch resolves. Everything
 * authoritative comes from `OrderResponse` via `useSessionOrder()`.
 */
export interface ActiveOrder {
  orderId: string;
  /** Table the order was placed against, echoed back for display. */
  tableNumber: number;
  /** ISO code the order was priced in. */
  currency: CurrencyCode;
  /** Status at the moment of creation, used until the first refetch. */
  statusId: number;
  statusCode: string;
  /** Localised status name from the create response. */
  statusName: string;
  /** Status colour from the create response. */
  statusColor: string;
  /** Epoch millis, for the tracking header. */
  createdAt: number;
}
/* ========================================================================== *
 * Tracking DTO returned by POST /api/tenant/Order and GET .../Order/{id}/Line
 * ========================================================================== */

/**
 * Lifecycle position of one timeline entry.
 *
 * Serialised either as these strings or as the ordinals `0`, `1`, `2`.
 * {@link ../lib/orderTracking.normalizeStepState} accepts both so the numeric
 * mapping lives in exactly one place.
 */
export type OrderStepState = 'Completed' | 'Current' | 'Upcoming';

/** One line of the tracking timeline, as returned by the backend. */
export interface OrderStatusStepDto {
  statusId: number;
  /** Already translated server-side for the request's language. */
  statusName: string;
  /** Hex colour, e.g. `"#F59E0B"`. */
  statusColor: string;
  state: OrderStepState | number;
  /** UTC instant, ISO-8601. `null` while the step is `Upcoming`. */
  changedAtUtc: string | null;
}

/** Tracking payload shared by the create and refresh endpoints. */
export interface OrderTrackingDto {
  orderId: string;
  orderNumber: number;
  tableNumber: number;
  currentStatus: OrderStatusStepDto;
  steps: OrderStatusStepDto[] | null;
  /** Finished **or** cancelled - the server's own answer, never inferred. */
  isFinal: boolean;
  /** Server rule for whether more items may be added. */
  canAddItems: boolean;
}

/**
 * A tracking step after normalization, in the order the backend sent it.
 *
 * Normalization happens once, in `lib/orderTracking.ts`, so the UI never has to
 * cope with a numeric enum, PascalCase keys or a missing `steps` array.
 */
export interface TrackingStep {
  statusId: number;
  statusName: string;
  color: string;
  state: OrderStepState;
  changedAtUtc: string | null;
  /** Stable machine code when the backend supplies one; may be empty. */
  code: string;
  /** Set for steps that turned Completed during the latest refresh. */
  justCompleted: boolean;
}

/** Current status, flattened for direct use by the card and the home bar. */
export interface OrderCurrentStatus {
  id: number;
  code: string;
  /** Server-translated; rendered as-is, never re-localized client-side. */
  name: string;
  color: string;
  isFinal: boolean;
}

/**
 * Everything the tracking UI consumes.
 *
 * The Line endpoint carries no line items or totals, so `items`/`subtotal`/
 * `total` are only populated when something else supplied them (the mock, or a
 * previous richer payload) and are carried forward across refreshes. The summary
 * card renders only when `items` is non-empty, so a real deployment simply shows
 * no summary instead of a stale or invented one.
 */
export interface OrderTrackingView {
  orderId: string;
  orderNumber: number;
  tableNumber: number;
  currentStatus: OrderCurrentStatus;
  steps: TrackingStep[];
  /** Derived from Completed steps, for anything still reading history. */
  statusHistory: OrderHistoryEntry[];
  isFinal: boolean;
  canAddItems: boolean;
  createdAt: string | null;
  items: OrderItemView[];
  subtotal: number;
  total: number;
  currencyCode: CurrencyCode | null;
}

/** Result of diffing two tracking snapshots, used to drive the transition. */
export interface TrackingChange {
  /** False for the first load, a plain re-render, or an unchanged status. */
  changed: boolean;
  fromStatusId: number | null;
  toStatusId: number | null;
  /** Status name to announce, already server-translated. */
  statusName: string | null;
  color: string | null;
  /** Steps that became Completed on this refresh (may be several at once). */
  newlyCompletedIds: number[];
  /** True when the order is known to be gone (404 ORDER_NOT_FOUND). */
  notFound: boolean;
}
