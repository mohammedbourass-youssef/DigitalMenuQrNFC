import { memo, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import { Check, Clock } from "lucide-react";

import { formatPrice } from "@/lib/orderBoardUtils";
import type { OrderSummaryDto } from "@/types/orders";

const MAX_VISIBLE_LINES = 3;

const CHIP_BASE =
  "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide";
/** Paid is the loud state; unpaid stays muted so paid cards draw the eye. */
const PAID_CHIP_CLASS = `${CHIP_BASE} bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400`;
const UNPAID_CHIP_CLASS = `${CHIP_BASE} bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400`;

export interface OrderCardViewProps {
  order: OrderSummaryDto;
  language: string;
  currency: string;
  dimmed?: boolean;
  /** Briefly highlight a card that just arrived from the hub. */
  highlight?: boolean;
}

/** Presentational card, also reused inside the drag overlay. */
export const OrderCardView = memo(function OrderCardView({
  order,
  language,
  currency,
  dimmed = false,
  highlight = false,
}: OrderCardViewProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const isCollapsible = order.lines.length > MAX_VISIBLE_LINES;
  const visible = expanded ? order.lines : order.lines.slice(0, MAX_VISIBLE_LINES);
  const hidden = order.lines.length - visible.length;

  // Only one opacity utility may be applied: Tailwind gives them equal
  // specificity, so `opacity-40` and `opacity-80` would fight over the
  // cascade order in the generated stylesheet. Dragging wins over payment.
  const opacityState = dimmed
    ? "opacity-40"
    : order.isPaid === true
      ? ""
      : "opacity-80 hover:opacity-100";

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-opacity dark:border-slate-700 dark:bg-slate-900 ${opacityState} ${
        highlight ? "animate-order-arrival" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
            #{order.orderNumber}
          </span>
          {order.isPaid === true && (
            <span className={PAID_CHIP_CLASS}>
              <Check className="h-2.5 w-2.5" aria-hidden />
              {t("orders.board.paid")}
            </span>
          )}
          {order.isPaid === false && (
            <span className={UNPAID_CHIP_CLASS}>
              <Clock className="h-2.5 w-2.5" aria-hidden />
              {t("orders.board.unpaid")}
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
          {t("orders.board.table", { number: order.tableNumber })}
        </span>
      </div>

      <ul className="mt-2 space-y-1">
        {visible.map((line) => (
          <li key={line.id} className="flex items-baseline justify-between gap-2 text-xs">
            <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {line.quantity} ×
              </span>{" "}
              {line.name}
            </span>
            <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
              {formatPrice(line.totalPrice, language, currency)}
            </span>
          </li>
        ))}
      </ul>

      {isCollapsible && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="mt-1.5 rounded text-xs font-medium text-orange-600 transition hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-orange-400 dark:hover:text-orange-300"
        >
          {expanded
            ? t("orders.board.showLess")
            : t("orders.board.moreLines", { count: hidden })}
        </button>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {t("orders.board.total")}
        </span>
        <span className="shrink-0 text-sm font-bold text-slate-900 dark:text-slate-100">
          {formatPrice(order.totalPrice, language, currency)}
        </span>
      </div>
    </div>
  );
});

interface OrderCardProps {
  order: OrderSummaryDto;
  language: string;
  currency: string;
  statusId: number;
  isDragging: boolean;
  /** True while this order's status change is still in flight. */
  disabled?: boolean;
  /** True right after the order arrived over the hub. */
  isNew?: boolean;
}

export const OrderCard = memo(function OrderCard({
  order,
  language,
  currency,
  statusId,
  isDragging,
  disabled = false,
  isNew = false,
}: OrderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({
    id: order.orderId,
    data: { type: "card", statusId },
    // Keeps a second drag from starting while the move is pending.
    disabled,
  });

  const dimmed = isDragging || sortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: dimmed ? 20 : undefined,
      }}
      {...attributes}
      {...listeners}
      aria-label={`#${order.orderNumber}, ${order.tableNumber}`}
      aria-busy={disabled || undefined}
      className={`touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
        disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
      }`}
    >
      <OrderCardView
        order={order}
        language={language}
        currency={currency}
        dimmed={dimmed}
        highlight={isNew}
      />
    </div>
  );
});