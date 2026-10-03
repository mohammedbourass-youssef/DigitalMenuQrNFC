import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, Table2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatMoney, formatTime } from "@/lib/orderBoardUtils";
import type { BoardOrderItem } from "@/types";

const MAX_VISIBLE_ITEMS = 4;

export function OrderCardView({
  order,
  language,
  dimmed = false,
}: {
  order: BoardOrderItem;
  language: string;
  dimmed?: boolean;
}) {
  const { t } = useTranslation();
  const visible = order.items.slice(0, MAX_VISIBLE_ITEMS);
  const hiddenCount = order.items.length - visible.length;

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-opacity ${
        dimmed ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-slate-900">#{order.orderNumber}</span>
        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
          <Clock className="h-3 w-3" aria-hidden />
          {formatTime(order.createdAt, language)}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Table2 className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        {order.tableName ?? t("orders.board.takeaway")}
      </div>

      <ul className="mt-2 space-y-1">
        {visible.map((line) => (
          <li
            key={`${order.id}-${line.name}-${line.quantity}`}
            className="flex items-baseline justify-between gap-2 text-xs text-slate-600"
          >
            <span className="truncate">
              <span className="font-semibold text-slate-700">{line.quantity}×</span>{" "}
              {line.name}
            </span>
            <span className="shrink-0 tabular-nums text-slate-500">
              {formatMoney(line.lineTotal, language, order.currencyCode)}
            </span>
          </li>
        ))}
        {hiddenCount > 0 && (
          <li className="text-xs text-slate-400">
            {t("orders.board.moreItems", { count: hiddenCount })}
          </li>
        )}
      </ul>

      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
        <span className="text-xs font-medium text-slate-500">{t("orders.board.total")}</span>
        <span className="text-sm font-bold text-slate-900">
          {formatMoney(order.total, language, order.currencyCode)}
        </span>
      </div>
    </div>
  );
}

interface OrderCardProps {
  order: BoardOrderItem;
  language: string;
  isActive?: boolean;
}

export function OrderCard({ order, language, isActive = false }: OrderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: order.id,
    data: { type: "card", statusKey: String(order.statusId) },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
      {...attributes}
      {...listeners}
      className="cursor-grab touch-none select-none outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-orange-500"
      aria-label={`#${order.orderNumber}${order.tableName ? `, ${order.tableName}` : ""}`}
    >
      <OrderCardView order={order} language={language} dimmed={isActive} />
    </div>
  );
}