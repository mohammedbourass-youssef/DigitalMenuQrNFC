import axios from "axios";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenantPlanInformations } from "@/hooks/useTenantPlanInformations";
import { getPlanStatus, parseUsage, type PlanStatus } from "@/lib/planUtils";
import type { TenantPlanInformations } from "@/types/plan";
import { PlansPricing } from "@/components/settings/PlansPricing";

export default function UpgradePage() {
  // Plan pricing and upgrade actions remain placeholders until their API is available.
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useTenantPlanInformations();
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;

  return (
    <div className="space-y-5">
      {isLoading ? (
        <CurrentPlanSkeleton />
      ) : status === 404 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          {t("settings.upgrade.noPlan")}
        </div>
      ) : error ? (
        <Alert variant="destructive" className="border-red-200 bg-white">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{t("settings.upgrade.loadError")}</span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("settings.upgrade.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : data ? (
        <CurrentPlanCard plan={data} />
      ) : null}

      <PlansPricing />
    </div>
  );
}

function CurrentPlanCard({ plan }: { plan: TenantPlanInformations }) {
  const { t, i18n } = useTranslation();
  const status = getPlanStatus(plan.isFree, plan.expiresATutc);

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(i18n.language).format(date);
  };

  const billingCycle = plan.isFree
    ? t("settings.upgrade.free")
    : plan.billingCycle === 1 || plan.billingCycle === "Monthly"
      ? t("settings.upgrade.monthly")
      : plan.billingCycle === 2 || plan.billingCycle === "Yearly"
        ? t("settings.upgrade.yearly")
        : String(plan.billingCycle);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#714B67]">{plan.tenantName}</p>
          <h2 className="mt-1 break-words text-2xl font-bold text-slate-900 sm:text-3xl">{plan.planName}</h2>
          {plan.description && <p className="mt-2 max-w-3xl text-sm text-slate-500">{plan.description}</p>}
        </div>
        <PlanStatusBadge status={status} />
      </div>

      <dl className="mt-6 grid gap-4 border-y border-slate-100 py-5 sm:grid-cols-3">
        <PlanInfo label={t("settings.upgrade.billingCycle")} value={billingCycle} />
        <PlanInfo label={t("settings.upgrade.startDate")} value={formatDate(plan.startAtUTC)} />
        <PlanInfo label={t("settings.upgrade.expirationDate")} value={formatDate(plan.expiresATutc)} />
      </dl>

      <section className="mt-5" aria-labelledby="plan-usage-heading">
        <h3 id="plan-usage-heading" className="text-base font-semibold text-slate-900">
          {t("settings.upgrade.usageLimits")}
        </h3>
        <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <UsageRow label={t("settings.upgrade.users")} value={plan.usedUsersFromTotal} />
          <UsageRow label={t("settings.upgrade.categories")} value={plan.usedCategoriesFromTotal} />
          <UsageRow label={t("settings.upgrade.menuItems")} value={plan.usedMenuItemsFromTotal} />
          <UsageRow label={t("settings.upgrade.tables")} value={plan.usedTablesFromTotal} />
          <UsageRow label={t("settings.upgrade.roles")} value={plan.usedRolesFromTotal} />
          <UsageRow label={t("settings.upgrade.languages")} value={plan.usedLanguagesTotal} />
          <PlanInfo
            label={t("settings.upgrade.maxImages")}
            value={String(plan.maxImagesPerMenu)}
          />
        </div>
      </section>
    </section>
  );
}

function PlanInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function PlanStatusBadge({ status }: { status: PlanStatus }) {
  const { t } = useTranslation();
  const styles: Record<PlanStatus, string> = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    expiringSoon: "border-orange-200 bg-orange-50 text-orange-700",
    expired: "border-red-200 bg-red-50 text-red-700",
  };

  return <Badge variant="outline" className={styles[status]}>{t(`settings.upgrade.status.${status}`)}</Badge>;
}

function UsageRow({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  const parsed = parseUsage(value);
  const valid = Number.isFinite(parsed.used);
  const unlimited = valid && parsed.total === null;
  const shownValue = !valid
    ? value || "—"
    : unlimited
      ? `${parsed.used} / ${t("settings.upgrade.unlimited")}`
      : `${parsed.used} / ${parsed.total}`;

  let barColor = "bg-[#714B67]";
  if (parsed.percent !== null && parsed.percent >= 70 && parsed.percent <= 90) barColor = "bg-orange-500";
  if (parsed.percent !== null && parsed.percent > 90) barColor = "bg-red-500";

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-xs font-medium tabular-nums text-slate-700">{shownValue}</span>
      </div>
      {valid && (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={unlimited ? 100 : parsed.percent ?? 0}
        >
          <div
            className={`h-full rounded-full ${unlimited ? "bg-slate-200" : barColor}`}
            style={{ width: `${unlimited ? 100 : parsed.percent ?? 0}%` }}
          />
        </div>
      )}
    </div>
  );
}

function CurrentPlanSkeleton() {
  return (
    <section aria-hidden="true" className="animate-pulse rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="h-4 w-36 rounded bg-slate-200" />
      <div className="mt-3 h-8 w-52 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-2/3 rounded bg-slate-100" />
      <div className="my-6 h-px bg-slate-100" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-12 rounded bg-slate-100" />)}
      </div>
      <div className="mt-6 h-5 w-40 rounded bg-slate-200" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-10 rounded bg-slate-100" />)}
      </div>
    </section>
  );
}
