import { useTranslation } from "react-i18next";
import type { PaymentType } from "@/types/planPricing";

interface BillingCycleToggleProps {
  paymentType: PaymentType;
  onChange: (paymentType: PaymentType) => void;
  yearlySavingsPercent: number | null;
}

export function BillingCycleToggle({ paymentType, onChange, yearlySavingsPercent }: BillingCycleToggleProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-start gap-3">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" role="group" aria-label={t("settings.upgrade.billingCycle")}>
        {(["Monthly", "Yearly"] as const).map((cycle) => (
          <button
            key={cycle}
            type="button"
            aria-pressed={paymentType === cycle}
            onClick={() => onChange(cycle)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              paymentType === cycle ? "bg-[#714B67] text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t(`settings.upgrade.${cycle.toLowerCase()}`)}
          </button>
        ))}
      </div>
      {yearlySavingsPercent !== null && Number.isFinite(yearlySavingsPercent) && (
        <p className="text-sm font-medium text-emerald-700">
          {t("settings.upgrade.saveUpTo", { percent: yearlySavingsPercent })}
        </p>
      )}
    </div>
  );
}
