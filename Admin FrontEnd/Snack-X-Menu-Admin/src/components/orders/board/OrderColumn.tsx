import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { ColumnMenu } from "@/components/orders/board/ColumnMenu";
import { OrderCard } from "@/components/orders/board/OrderCard";
import { columnIdOf } from "@/lib/orderBoardUtils";
import type { BoardOrderItem, OrderStatusItem } from "@/types";

const DEFAULT_COLOR = "#94A3B8";

interface OrderColumnProps {
  status: OrderStatusItem;
  orders: BoardOrderItem[];
  statusKey: string;
  language: string;
  currencyCode: string;
  isOwner: boolean;
  dragging: boolean;
  hovered: boolean;
  activeId: string | null;
  onAddOrder: (statusId: number) => void;
  onRename: (status: OrderStatusItem) => void;
  onRemove: (status: OrderStatusItem) => void;
}

export function OrderColumn({
  status,
  orders,
  statusKey,
  language,
  currencyCode,
  isOwner,
  dragging,
  hovered,
  activeId,
  onAddOrder,
  onRename,
  onRemove,
}: OrderColumnProps) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: columnIdOf(statusKey) });

  const highlighted = hovered || (dragging && isOver);

  return (
    <section
      ref={setNodeRef}
      aria-label={status.name}
      className={`flex h-full min-h-0 w-full flex-1 min-w-[260px] flex-col rounded-2xl border bg-slate-100/80 transition-colors dark:bg-slate-800/60 ${
        highlighted
          ? "border-orange-400 ring-2 ring-orange-400/40"
          : "border-slate-200 dark:border-slate-700"
      }`}
    >
      <header className="flex items-center gap-2 px-3 pb-2 pt-3">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: status.color ?? DEFAULT_COLOR }}
          aria-hidden
        />
        <h2 className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">
          {status.name}
        </h2>
        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-700 dark:text-slate-200 tabular-nums">
          {orders.length}
        </span>
        <ColumnMenu status={status} isOwner={isOwner} onRename={onRename} onRemove={onRemove} />
      </header>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-2 pb-2">
        <SortableContext
          items={orders.map((order) => order.id)}
          strategy={verticalListSortingStrategy}
        >
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              language={language}
              isActive={dragging && order.id === activeId}
            />
          ))}
        </SortableContext>

        {orders.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-600 dark:text-slate-500">
            {t("orders.board.noOrders")}
          </div>
        )}
      </div>

      <footer className="p-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onAddOrder(status.id)}
          className="h-9 w-full justify-start gap-2 text-sm font-medium text-slate-500 hover:bg-white hover:text-slate-800 dark:hover:bg-slate-700 dark:hover:text-slate-100"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t("orders.board.addOrder")}
        </Button>
      </footer>
    </section>
  );
}