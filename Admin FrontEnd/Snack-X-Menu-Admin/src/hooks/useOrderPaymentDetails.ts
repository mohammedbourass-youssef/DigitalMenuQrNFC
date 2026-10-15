import { useQuery } from "@tanstack/react-query";

import { getOrderPayment } from "@/services/orderService";

/**
 * Payment details of one paid order. Fetched only while a paid order's dialog is
 * open; the board payload has no method/date/amount beyond `isPaid`.
 *
 * `retry: false` on purpose: until the backend exposes the endpoint, a 404 must
 * degrade to "details unavailable" instead of hammering the API three times.
 */
export const orderPaymentDetailsKey = (orderId: string | null) =>
  ["orders", "payment", orderId] as const;

export function useOrderPaymentDetails(orderId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: orderPaymentDetailsKey(orderId),
    queryFn: ({ signal }) => getOrderPayment(orderId as string, signal),
    enabled: enabled && orderId !== null,
    retry: false,
    staleTime: 30_000,
  });
}
