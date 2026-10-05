import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { getCurrency } from "@/lib/preferences";
import { toOrderPaymentInfo } from "@/lib/orderPaymentUtils";
import { useEnabledPaymentMethods } from "@/hooks/usePaymentMethods";
import type { OrderPaymentInfo, PaymentMethodOption } from "@/types/orderPayment";
import type { OrderSummaryDto } from "@/types/orders";

export interface UseOrderPaymentModalReturn {
  isOpen: boolean;
  order: OrderSummaryDto | null;
  open: (order: OrderSummaryDto) => void;
  close: () => void;
  /** The open order read into the dialog's shape. Null while closed. */
  info: OrderPaymentInfo | null;
  methods: PaymentMethodOption[];
  isMethodsLoading: boolean;
  isMethodsError: boolean;
  refetchMethods: () => void;
}

/**
 * Owns the pop-up's open state and the payment-method list it renders.
 *
 * The payment information is a pure projection of the board order that is
 * already in memory, so there is nothing to fetch and nothing to fake. The
 * methods come from the shared `GET /api/PaymentMethods/Enabled` service - the
 * same one the payment-methods screen uses - and are only fetched once somebody
 * actually opens a payment dialog.
 */
export function useOrderPaymentModal(): UseOrderPaymentModalReturn {
  const { i18n } = useTranslation();
  const [order, setOrder] = useState<OrderSummaryDto | null>(null);

  const open = useCallback((next: OrderSummaryDto) => setOrder(next), []);
  const close = useCallback(() => setOrder(null), []);

  const methodsQuery = useEnabledPaymentMethods(order !== null, i18n.language);

  const info = useMemo(
    () => (order ? toOrderPaymentInfo(order, getCurrency()) : null),
    [order]
  );

  return useMemo(
    () => ({
      isOpen: order !== null,
      order,
      open,
      close,
      info,
      methods: methodsQuery.data ?? [],
      isMethodsLoading: methodsQuery.isPending && order !== null,
      isMethodsError: methodsQuery.isError,
      refetchMethods: () => void methodsQuery.refetch(),
    }),
    [
      close,
      info,
      methodsQuery.data,
      methodsQuery.isError,
      methodsQuery.isPending,
      methodsQuery.refetch,
      open,
      order,
    ]
  );
}