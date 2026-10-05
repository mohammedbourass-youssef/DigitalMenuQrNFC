import { memo } from "react";
import { useTranslation } from "react-i18next";

import { formatPrice } from "@/lib/orderBoardUtils";
import type { OrderPaymentItem } from "@/types/orderPayment";

interface OrderPaymentItemsTableProps {
  items: OrderPaymentItem[];
  language: string;
  currency: string;
}

/** Odoo-style lines table: name on the left, three right-aligned numbers. */
export const OrderPaymentItemsTable = memo(function OrderPaymentItemsTable({
  items,
  language,
  currency,
}: OrderPaymentItemsTableProps) {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
            <th
              scope="col"
              className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              {t("orderPayment.items.column.item")}
            </th>
            <th
              scope="col"
              className="w-16 px-3 py-2 text-end text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              {t("orderPayment.items.column.quantity")}
            </th>
            <th
              scope="col"
              className="w-28 px-3 py-2 text-end text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              {t("orderPayment.items.column.unitPrice")}
            </th>
            <th
              scope="col"
              className="w-28 px-3 py-2 text-end text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              {t("orderPayment.items.column.lineTotal")}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-slate-100 last:border-0 dark:border-slate-800"
            >
              <td className="px-3 py-2 align-top">
                <span className="block text-slate-800 dark:text-slate-100">{item.name}</span>
              </td>
              <td className="px-3 py-2 text-end align-top tabular-nums text-slate-600 dark:text-slate-300">
                {item.quantity}
              </td>
              <td className="px-3 py-2 text-end align-top tabular-nums text-slate-600 dark:text-slate-300">
                {formatPrice(item.unitPrice, language, currency)}
              </td>
              <td className="px-3 py-2 text-end align-top font-medium tabular-nums text-slate-800 dark:text-slate-100">
                {formatPrice(item.lineTotal, language, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});