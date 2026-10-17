import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { SidebarToggleButton } from "@/components/layout/SidebarToggleButton";
import { OrderBoard } from "@/components/orders/board/OrderBoard";
import { OrderPaymentModal } from "@/components/orders/payment/OrderPaymentModal";
import { Button } from "@/components/ui/button";
import { useCurrentOrders, type UseCurrentOrdersReturn } from "@/hooks/useCurrentOrders";
import { useOrderLiveChanges, type OrderLiveState } from "@/hooks/useOrderLiveChanges";
import { useOrderPaymentModal } from "@/hooks/useOrderPaymentModal";
import { formatClock } from "@/lib/orderBoardUtils";
import type { OrderSummaryDto } from "@/types/orders";

const LIVE_DOT_CLASS: Record<OrderLiveState, string> = {
  connecting: "bg-amber-400 motion-safe:animate-pulse",
  connected: "bg-emerald-500",
  reconnecting: "bg-amber-400 motion-safe:animate-pulse",
  disconnected: "bg-red-500",
};

export default function OrdersPage() {
  const { t, i18n } = useTranslation();

  // Resolved once the hub subscription is in place. The board fetch waits on it,
  // so the page must declare the live hook before the board hook: React runs
  // effects in declaration order.
  const subscriptionGate = useRef<Promise<void> | null>(null);
  const boardRef = useRef<UseCurrentOrdersReturn | null>(null);

  const handleNewOrder = useCallback((order: OrderSummaryDto) => {
    boardRef.current?.addLiveOrder(order);
  }, []);

  // The hub does not replay events, so recover what was missed by refetching.
  const handleReconnected = useCallback(() => {
    void boardRef.current?.refresh();
  }, []);

  const live = useOrderLiveChanges(handleNewOrder, {
    onReconnected: handleReconnected,
    subscriptionGate,
  });

  const board = useCurrentOrders({ subscriptionGate });

  // One instance, shared by the cards (badges) and the dialog, so a payment
  // registered in the dialog is reflected on the card behind it.
  const paymentModal = useOrderPaymentModal();

  useEffect(() => {
    boardRef.current = board;
  });

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
      <div className="flex w-full shrink-0 flex-wrap items-start justify-between gap-4">
        {/* The top bar hides its own toggle on this route, so the board owns it. */}
        <div className="flex items-start gap-3">
          <SidebarToggleButton className="mt-0.5" />
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
              {t("orders.title")}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("orders.titleDescription")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <span
              className={`h-2 w-2 rounded-full ${LIVE_DOT_CLASS[live.state]}`}
              aria-hidden
            />
            {t(`orders.live.${live.state}`)}
          </span>
          {board.lastUpdatedAt !== null && (
            <span className="text-xs text-slate-400">
              {t("orders.board.lastUpdated", {
                time: formatClock(board.lastUpdatedAt, i18n.language),
              })}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => void board.refresh()}
            disabled={board.isRefreshing}
            aria-busy={board.isRefreshing}
            aria-label={t("orders.board.refreshAria")}
            title={t("orders.board.refreshAria")}
          >
            {board.isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden />
            )}
            {board.isRefreshing ? t("orders.board.refreshing") : t("orders.board.refresh")}
          </Button>
        </div>
      </div>

      <OrderBoard board={board} onOpenPayment={paymentModal.open} />

      {/* Outside the board so a drag can never start from inside the dialog. */}
      <OrderPaymentModal controller={paymentModal} />
    </div>
  );
}
