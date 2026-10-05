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