import type { TenantPaymentMethod } from "@/types/paymentMethod";

/**
 * Models for the "Payment informations" pop-up on the orders board.
 *
 * Payment methods come from the real API (`GET /api/PaymentMethods/Enabled`),
 * which returns exactly `TenantPaymentMethod`, so that type is reused as-is.
 *
 * Everything else is derived from the board's own order payload - nothing is
 * invented. `OrderSummaryDto` carries no created date, no notes and no payment
 * history, so those simply do not exist here until the API exposes them.
 */

/** Enabled payment methods for the pop-up dropdown. */
export type PaymentMethodOption = TenantPaymentMethod;

/**
 * Only `Unpaid` and `Paid` can occur today, because the board tells us one bit:
 * `isPaid`. `Partial` and `Refunded` are kept so the badge and the translations
 * are ready the moment the payment endpoint reports finer states.
 */
export type OrderPaymentStatus = "Unpaid" | "Partial" | "Paid" | "Refunded";

export interface OrderPaymentItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/** The board order, read through the lens the payment dialog needs. */
export interface OrderPaymentInfo {
  orderId: string;
  orderNumber: number;
  tableNumber: number;
  currencyCode: string;
  items: OrderPaymentItem[];
  total: number;
  /** `isPaid ? total : 0`. There is no partial-payment data to read yet. */
  paidAmount: number;
  paymentStatus: OrderPaymentStatus;
}

/**
 * Body of `POST /api/Orders/Pay`.
 *
 * `orderId` stays a string on the client because the board's
 * `OrderSummaryDto.orderId` is a Guid serialized as a string; the backend's
 * `PayOrder.OrderId` is a `Guid` and binds it. `userId`, `tenantId` and
 * `currency` are deliberately absent: the server takes them from the token.
 */
export interface PayOrderRequest {
  orderId: string;
  /** The selected `TenantPaymentMethod.id`. */
  paymentId: number;
  /** Must equal the order total exactly, or the server answers 400. */
  amountToPay: number;
  notes: string | null;
}

/* ------------------------------------------------------------------ *
 * Paid order details (`GET /api/Orders/{orderId}/Payment`)
 *
 * The board payload only carries `isPaid`, so "where / when / how" an order was
 * paid has to come from the invoice. Read-only: nothing here is ever submitted.
 * ------------------------------------------------------------------ */

export interface OrderPaymentMethodDetails {
  /** `TenantPaymentMethod.id`. */
  id: number;
  code: string;
  /** `DisplayName ?? SystemName`, translated by the server via `X-Lang`. */
  label: string;
  color: string | null;
  icon: string | null;
}

export interface OrderPaymentCashier {
  userId: string;
  fullName: string | null;
}

export interface OrderPaymentDetails {
  orderId: string;
  invoiceId: string;
  orderTotal: number;
  paidAmount: number;
  currencyCode: string;
  /** ISO-8601 UTC instant of the invoice. */
  paidAtUtc: string;
  paymentMethod: OrderPaymentMethodDetails;
  notes: string | null;
  cashier: OrderPaymentCashier | null;
}