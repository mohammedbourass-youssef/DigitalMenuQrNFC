import axios from "axios";

import axiosInstance from "@/lib/axios";
import type { CurrentOrdersResponse } from "@/types/orders";

/**
 * The single source of the orders board. Columns arrive in display order and
 * must not be re-sorted on the client.
 */
export const getCurrentOrders = async (): Promise<CurrentOrdersResponse> => {
  const { data } = await axiosInstance.get<CurrentOrdersResponse>("orders/current-orders");
  return data;
};

export type OrderMoveErrorCode = "not-found" | "conflict" | "unauthorized" | "unknown";

/**
 * Typed failure of a single order move so the board can react per status.
 *
 * `message` carries the server text when the endpoint sent one (`{ error }`) and
 * is otherwise left empty on purpose: the caller owns the user-facing wording,
 * which has to stay localized.
 */
export class OrderMoveError extends Error {
  readonly code: OrderMoveErrorCode;
  readonly status?: number;

  constructor(code: OrderMoveErrorCode, message: string, status?: number) {
    super(message);
    this.name = "OrderMoveError";
    this.code = code;
    this.status = status;
  }
}

const readServerMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) return "";
  const data: unknown = error.response?.data;
  if (typeof data === "string") return data;
  if (typeof data === "object" && data !== null) {
    const { error: body } = data as { error?: unknown };
    if (typeof body === "string") return body;
  }
  return "";
};

const toOrderMoveError = (error: unknown): OrderMoveError => {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const message = readServerMessage(error);

  if (status === 404) return new OrderMoveError("not-found", message, status);
  if (status === 409) return new OrderMoveError("conflict", message, status);
  if (status === 401 || status === 403) {
    return new OrderMoveError("unauthorized", message, status);
  }
  return new OrderMoveError("unknown", message, status);
};

/**
 * Moves one order to another status.
 *
 * The board applies the move optimistically before calling this and rolls back
 * when the promise rejects, so this only owns the request and the error shape.
 * `signal` lets the caller abort moves that are still in flight on unmount.
 */
export const updateOrderStatus = async (
  orderId: string,
  toStatusId: number,
  signal?: AbortSignal
): Promise<void> => {
  try {
    // Relative on purpose: baseURL already ends with `/api`.
    await axiosInstance.patch(`orders/${orderId}/move-to/${toStatusId}`, null, { signal });
  } catch (error) {
    // Cancellations stay untouched so callers can stay silent about them.
    if (axios.isCancel(error)) throw error;
    throw toOrderMoveError(error);
  }
};