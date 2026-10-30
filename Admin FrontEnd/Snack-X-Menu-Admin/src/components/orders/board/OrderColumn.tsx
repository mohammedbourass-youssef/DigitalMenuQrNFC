import { memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useTranslation } from "react-i18next";

import { OrderCard } from "@/components/orders/board/OrderCard";
import { columnIdOf } from "@/lib/orderBoardUtils";
import type { OrderStatusColumnDto, OrderSummaryDto } from "@/types/orders";

const FALLBACK_COLOR = "#94A3B8";
const COLUMN_WIDTH = "w-[320px]";

export interface OrderColumnProps {
  column: OrderStatusColumnDto;
  language: string;
  currency: string;
  isDragging: boolean;
  activeOrderId: string | null;
  pendingOrderIds: ReadonlySet<string>;
  newOrderIds: ReadonlySet<string>;
  canEdit: boolean;
  onOpenPayment: (order: OrderSummaryDto) => void;
}

export const OrderColumn = memo(function OrderColumn({
  column,
  language,
  currency,
  isDragging,
  activeOrderId,
  pendingOrderIds,
  newOrderIds,
  canEdit,
  onOpenPayment,
}: OrderColumnProps) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: columnIdOf(column.statusId) });

  const color = column.statusColor || FALLBACK_COLOR;
  const highlighted = isDragging && isOver;

  return (
    <section
      ref={setNodeRef}
      aria-label={column.statusName}
      className={`flex h-full min-h-0 ${COLUMN_WIDTH} shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100/80 transition-colors dark:border-slate-700 dark:bg-slate-800/60 ${
        highlighted ? "border-orange-400 ring-2 ring-orange-400/40" : ""
      }`}
    >
      <div className="h-1 w-full shrink-0" style={{ backgroundColor: color }} aria-hidden />

      <header className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-3">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <h2 className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">
          {column.statusName}
        </h2>
        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600 shadow-sm dark:bg-slate-700 dark:text-slate-200">
          {column.totalOrders}
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-2 pb-2">
        <SortableContext
          items={column.orders.map((order) => order.orderId)}
          strategy={verticalListSortingStrategy}
        >
          {column.orders.map((order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              language={language}
              currency={currency}
              statusId={column.statusId}
              isDragging={activeOrderId === order.orderId}
              disabled={!canEdit || pendingOrderIds.has(order.orderId)}
              isNew={newOrderIds.has(order.orderId)}
              onOpenPayment={canEdit ? onOpenPayment : undefined}
            />
          ))}
        </SortableContext>

        {column.orders.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-600 dark:text-slate-500">
            {t("orders.board.noOrders")}
          </div>
        )}
      </div>
    </section>
  );
});