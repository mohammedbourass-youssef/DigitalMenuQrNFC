import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPlanPrice } from "@/lib/planPricingUtils";
import { getCurrency } from "@/lib/preferences";
import type { PaymentType, PlanPricing } from "@/types/planPricing";
import { PlanFeatureList } from "@/components/settings/PlanFeatureList";

interface PlanCardProps {
  plan: PlanPricing;
  paymentType: PaymentType;
  isCurrent: boolean;
  onUpgrade: (plan: PlanPricing) => void;
}

export function PlanCard({ plan, paymentType, isCurrent, onUpgrade }: PlanCardProps) {
  const { t, i18n } = useTranslation();
  const name = typeof plan.name === "string" && plan.name.trim() ? plan.name : "—";
  const isFree = plan.isFree === true;
  const savings = typeof plan.yearlySavingsPercent === "number" && Number.isFinite(plan.yearlySavingsPercent)
    ? plan.yearlySavingsPercent
    : null;
  const canUpgrade = plan.canUpgrade === true;
  const price = isFree
    ? t("settings.upgrade.free")
    : formatPlanPrice(
        plan.price,
        typeof plan.currencyCode === "string" ? plan.currencyCode : getCurrency(),
        i18n.language,
      );

  return (
    <article
      className={`relative flex flex-col rounded-lg border bg-white p-5 shadow-sm transition-opacity ${
        isCurrent
          ? "border-[#714B67] ring-1 ring-[#714B67]"
          : canUpgrade
            ? "border-slate-200"
            : "border-slate-200 opacity-60"
      }`}
    >
      <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
        {isCurrent ? (
          <Badge className="bg-[#714B67] text-white hover:bg-[#714B67]">{t("settings.upgrade.currentPlan")}</Badge>
        ) : <span />}
        {paymentType === "Yearly" && savings !== null && (
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            {t("settings.upgrade.savePercent", { percent: savings })}
          </Badge>
        )}
      </div>

      <h3 className="mt-3 text-lg font-semibold text-slate-900">{name}</h3>
      {typeof plan.description === "string" && plan.description.trim() && (
        <p className="mt-1 min-h-10 text-sm text-slate-500">{plan.description}</p>
      )}

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight text-slate-900">{price}</span>
        {!isFree && (
          <span className="text-sm text-slate-500">
            {paymentType === "Monthly" ? t("settings.upgrade.perMonth") : t("settings.upgrade.perYear")}
          </span>
        )}
      </div>

      <div className="my-5 border-t border-slate-100" />
      <div className="flex-1">
        <PlanFeatureList plan={plan} />
      </div>

      {isCurrent ? (
        <Button disabled className="mt-5 bg-[#714B67] text-white opacity-100 hover:bg-[#714B67]">
          {t("settings.upgrade.currentPlan")}
        </Button>
      ) : canUpgrade ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mt-5">
                <Button variant="outline" className="w-full" onClick={() => onUpgrade(plan)}>
                  {t("settings.upgrade.upgrade")}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>{t("settings.upgrade.comingSoon")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </article>
  );
}
