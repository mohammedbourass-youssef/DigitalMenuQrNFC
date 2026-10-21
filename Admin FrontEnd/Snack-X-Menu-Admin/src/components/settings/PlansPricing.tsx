import { useState } from "react";
import axios from "axios";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BillingCycleToggle } from "@/components/settings/BillingCycleToggle";
import { PlanCard } from "@/components/settings/PlanCard";
import { useAllPlans } from "@/hooks/useAllPlans";
import type { PaymentType, PlanPricing } from "@/types/planPricing";

export function PlansPricing() {
  const { t } = useTranslation();
  const [paymentType, setPaymentType] = useState<PaymentType>("Monthly");
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<string | null>(null);
  const { data, isLoading, isFetching, error, refetch } = useAllPlans(paymentType);
  const plans = Array.isArray(data) ? data : [];
  const savingValues = plans
    .map((plan) => plan.yearlySavingsPercent)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const yearlySavingsPercent = savingValues.length > 0 ? Math.max(...savingValues) : null;
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const serverMessage = axios.isAxiosError<{ error?: unknown }>(error)
    ? error.response?.data?.error
    : undefined;
  const errorMessage = (status === 404 || status === 500) && typeof serverMessage === "string" && serverMessage.trim()
    ? serverMessage
    : t("settings.upgrade.plansError");

  const onUpgrade = (plan: PlanPricing) => {
    setSelectedUpgradePlan(plan.name);
  };

  const currentPlan = plans.find((plan) => plan.isCurrent === true);
  const firstLoad = isLoading && plans.length === 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">{t("settings.upgrade.plansPricing")}</h2>
      <p className="mt-1 text-sm text-slate-500">{t("settings.upgrade.plansDescription")}</p>

      <div className="mt-5">
        <BillingCycleToggle
          paymentType={paymentType}
          onChange={setPaymentType}
          yearlySavingsPercent={yearlySavingsPercent}
        />
      </div>

      {error ? (
        <Alert variant="destructive" className="mt-5 border-red-200 bg-white">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("settings.upgrade.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : firstLoad ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((item) => <PlanCardSkeleton key={item} />)}
        </div>
      ) : plans.length === 0 ? (
        <p className="mt-5 rounded-md border border-slate-100 bg-slate-50 p-5 text-sm text-slate-500">
          {t("settings.upgrade.noPlans")}
        </p>
      ) : (
        <div className={`mt-5 grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${isFetching ? "opacity-60" : "opacity-100"}`}>
          {plans.map((plan, index) => (
            <PlanCard
              key={typeof plan.id === "number" ? plan.id : `${plan.name}-${index}`}
              plan={plan}
              paymentType={paymentType}
              isCurrent={currentPlan === plan}
              onUpgrade={onUpgrade}
            />
          ))}
        </div>
      )}

      <Dialog
        open={selectedUpgradePlan !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedUpgradePlan(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.upgrade.upgradeDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("settings.upgrade.upgradeDialog.description", { plan: selectedUpgradePlan ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setSelectedUpgradePlan(null)}>{t("settings.upgrade.upgradeDialog.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function PlanCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-5">
      <div className="h-5 w-24 rounded bg-slate-100" />
      <div className="mt-5 h-6 w-32 rounded bg-slate-200" />
      <div className="mt-3 h-9 w-36 rounded bg-slate-100" />
      <div className="my-5 border-t border-slate-100" />
      {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="mt-3 h-4 rounded bg-slate-100" />)}
      <div className="mt-6 h-9 rounded bg-slate-100" />
    </div>
  );
}
