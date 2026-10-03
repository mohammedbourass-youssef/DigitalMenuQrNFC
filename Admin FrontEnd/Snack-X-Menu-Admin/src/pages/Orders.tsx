import { useTranslation } from "react-i18next";

import { OrderBoard } from "@/components/orders/board/OrderBoard";
import { SidebarToggleButton } from "@/components/layout/SidebarToggleButton";

export default function OrdersPage() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
      </div>

      <OrderBoard />
    </div>
  );
}