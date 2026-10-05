import type {
  OrderPaymentInfo,
  OrderPaymentStatus,
  PaymentMethodOption,
} from "@/types/orderPayment";
import type { OrderSummaryDto } from "@/types/orders";

/* ------------------------------------------------------------------ *
 * Amounts
 * ------------------------------------------------------------------ */

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** `total - paid`, floored at zero so float noise never shows a negative due. */
export function amountDue(total: number, paidAmount: number): number {
  return Math.max(0, round2(total - paidAmount));
}

/**
 * Parses what the customer typed. Accepts a comma decimal separator, because
 * that is what a French or Arabic keyboard produces. Returns `null` for
 * anything that is not a number, so "" and "-" are both "not filled in yet".
 */
export function parseAmount(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export type AmountError = "required" | "tooHigh";

/**
 * Greater than 0 and never more than what is due. A cent of float tolerance
 * keeps "150" from failing against a due of 149.99999999999997.
 */
export function validateAmount(value: string, due: number): AmountError | null {
  const parsed = parseAmount(value);
  if (parsed === null || parsed <= 0) return "required";
  if (parsed > due + 0.005) return "tooHigh";
  return null;
}

/** Two decimals, never exponential notation (`1e-7` would break an input). */
export function toAmountInputValue(value: number): string {
  return round2(value).toFixed(2);
}

/* ------------------------------------------------------------------ *
 * Payment methods
 * ------------------------------------------------------------------ */

/**
 * The `isDefault` method wins; otherwise the first one in the list (the API
 * already sorts by `displayOrder`). Returns `null` for an empty list so the
 * caller can keep the Paid button disabled.
 */
export function defaultPaymentMethodId(
  methods: PaymentMethodOption[]
): number | null {
  return methods.find((method) => method.isDefault)?.id ?? methods[0]?.id ?? null;
}

/* ------------------------------------------------------------------ *
 * Dates
 * ------------------------------------------------------------------ */

/** `yyyy-MM-dd` in the browser's local time - what `<input type="date">` wants. */
export function todayInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/* ------------------------------------------------------------------ *
 * Order projection
 * ------------------------------------------------------------------ */

/**
 * Reads the board's own order into the shape the dialog renders. This is a
 * projection, not a request: the board already holds every field we can honestly
 * show, and nothing is defaulted or invented along the way.
 *
 * The status follows `isPaid` and nothing else. Deriving it from the arithmetic
 * instead would mark a real unpaid order as paid the moment its total reached
 * zero. `paidAmount` is likewise all-or-nothing, because the board gives us one
 * bit and not a payment history.
 */
export function toOrderPaymentInfo(
  order: OrderSummaryDto,
  currencyCode: string
): OrderPaymentInfo {
  const total = round2(order.totalPrice);
  const isPaid = order.isPaid === true;

  return {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    tableNumber: order.tableNumber,
    currencyCode,
    items: order.lines.map((line) => ({
      id: line.id,
      name: line.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.totalPrice,
    })),
    total,
    paidAmount: isPaid ? total : 0,
    paymentStatus: isPaid ? "Paid" : "Unpaid",
  };
}