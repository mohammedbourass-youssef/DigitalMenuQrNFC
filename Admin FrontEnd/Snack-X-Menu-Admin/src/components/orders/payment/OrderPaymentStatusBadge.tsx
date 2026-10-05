import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Check, Clock, Percent, Undo2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { OrderPaymentStatus } from "@/types/orderPayment";

/**
 * One palette for both the board card and the pop-up header, so a card that
 * turns emerald is instantly recognisable in the dialog. Unpaid stays muted,
 * partial reads amber, paid is the loud green.
 */
const STATUS_STYLE: Record<
  OrderPaymentStatus,
  { className: string; Icon: LucideIcon }
> = {
  Unpaid: {
    className:
      "bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400",
    Icon: Clock,
  },
  Partial: {
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    Icon: Percent,
  },
  Paid: {
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    Icon: Check,
  },
  Refunded: {
    className:
      "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
    Icon: Undo2,
  },
};

const SIZE_STYLE = {
  sm: "gap-0.5 px-1.5 py-0.5 text-[10px]",
  md: "gap-1 px-2 py-0.5 text-xs",
} as const;

const ICON_SIZE = { sm: "h-2.5 w-2.5", md: "h-3 w-3" } as const;

interface OrderPaymentStatusBadgeProps {
  status: OrderPaymentStatus;
  size?: keyof typeof SIZE_STYLE;
}

export const OrderPaymentStatusBadge = memo(function OrderPaymentStatusBadge({
  status,
  size = "sm",
}: OrderPaymentStatusBadgeProps) {
  const { t } = useTranslation();
  const { className, Icon } = STATUS_STYLE[status];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-bold uppercase tracking-wide ${className} ${SIZE_STYLE[size]}`}
    >
      <Icon className={ICON_SIZE[size]} aria-hidden />
      {t(`orderPayment.status.${status.toLowerCase()}`)}
    </span>
  );
});