import axios from "axios";
import {
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  CreditCard,
  FileText,
  FolderTree,
  LayoutGrid,
  Lock,
  MessageSquare,
  Minus,
  RefreshCw,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Tags,
  UserRoundCog,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyPermissions } from "@/hooks/useMyPermissions";
import { cn } from "@/lib/utils";
import type { FeaturePermission, FeatureStatus } from "@/types/permissions";

const FEATURE_ICONS: Record<string, LucideIcon> = {
  Menu: UtensilsCrossed,
  Categories: FolderTree,
  Tables: LayoutGrid,
  Orders: ClipboardList,
  Invoices: FileText,
  Users: UserRoundCog,
  Roles: ShieldCheck,
  AiAgent: Bot,
  DataAnalyst: BarChart3,
  Chatbot: MessageSquare,
  Notifications: Bell,
  PaymentMethods: CreditCard,
  PaymentStatuses: CircleDollarSign,
  NfcTags: Tags,
  Settings: Settings2,
  Subscription: Sparkles,
  Employees: Users,
  Departments: Building2,
  JobTitles: BriefcaseBusiness,
  LeaveManagement: CalendarDays,
  Attendance: Clock3,
  Payroll: Wallet,
  AuditLog: ScrollText,
  HRGeneralSettings: Settings2,
};

const STATUS_STYLES: Record<FeatureStatus, string> = {
  Available: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ComingSoon: "border-amber-200 bg-amber-50 text-amber-700",
  UnderMaintenance: "border-orange-200 bg-orange-50 text-orange-700",
};

const ACTIONS: Array<{
  key: "canRead" | "canAdd" | "canEdit" | "canDelete";
  labelKey: string;
}> = [
  { key: "canRead", labelKey: "permissions.actions.read" },
  { key: "canAdd", labelKey: "permissions.actions.add" },
  { key: "canEdit", labelKey: "permissions.actions.edit" },
  { key: "canDelete", labelKey: "permissions.actions.delete" },
];

export default function DiscoverMyPermissionsPage() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useMyPermissions();
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const includedCount = data?.features.filter((feature) => feature.isInPlan).length ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[#714B67]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              {t("permissions.eyebrow")}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{t("permissions.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{t("permissions.subtitle")}</p>
        </div>

        {data?.plan && (
          <div className="min-w-48 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{t("permissions.currentPlan")}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-slate-900">{data.plan.name}</span>
              {data.plan.isFree && (
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                  {t("permissions.free")}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {t("permissions.roles")}: {data.roles.length > 0 ? data.roles.join(", ") : "—"}
            </p>
          </div>
        )}
      </header>

      {isLoading ? (
        <PermissionsSkeleton />
      ) : status === 404 ? (
        <Alert className="border-amber-200 bg-white">
          <AlertDescription>{t("permissions.notFound")}</AlertDescription>
        </Alert>
      ) : error ? (
        <Alert variant="destructive" className="border-red-200 bg-white">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{t("permissions.loadError")}</span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("permissions.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : data ? (
        <section aria-labelledby="permissions-features-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="permissions-features-heading" className="text-base font-semibold text-slate-900">
              {t("permissions.features")}
            </h2>
            <p className="text-sm text-slate-500">
              {t("permissions.summary", {
                included: includedCount,
                total: data.features.length,
              })}
            </p>
          </div>

          {data.features.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
              {t("permissions.empty")}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.features.map((feature) => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  planName={data.plan?.name ?? t("permissions.currentPlanFallback")}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function FeatureCard({
  feature,
  planName,
}: {
  feature: FeaturePermission;
  planName: string;
}) {
  const { t } = useTranslation();
  const Icon = FEATURE_ICONS[feature.code] ?? ShieldCheck;
  const statusStyle = STATUS_STYLES[feature.status] ?? "border-slate-200 bg-slate-50 text-slate-600";
  const statusLabel = t(`permissions.status.${feature.status}`, {
    defaultValue: feature.status,
  });

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl border bg-white p-5 shadow-sm",
        feature.isInPlan
          ? feature.canRead
            ? "border-slate-200"
            : "border-amber-200"
          : "border-dashed border-slate-300 bg-slate-50/70"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            feature.isInPlan ? "bg-[#714B67]/10 text-[#714B67]" : "bg-slate-200 text-slate-500"
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-semibold text-slate-900">{feature.name}</h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge variant="outline" className={statusStyle}>
              {statusLabel}
            </Badge>
            {!feature.isInPlan && (
              <Badge variant="outline" className="border-slate-300 bg-white text-slate-500">
                {t("permissions.notInPlan")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex-1">
        {feature.isInPlan ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("permissions.actions.label")}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {ACTIONS.map(({ key, labelKey }) => {
                const enabled = feature[key];

                return (
                  <span
                    key={key}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
                      enabled
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-400"
                    )}
                  >
                    {enabled ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {t(labelKey)}
                  </span>
                );
              })}
            </div>
            {!feature.canRead && (
              <p className="mt-3 text-xs text-amber-700">{t("permissions.noAccess")}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">
            {t("permissions.upgradeHint", { plan: planName })}
          </p>
        )}
      </div>

      {!feature.isInPlan && (
        <Button asChild className="mt-5 w-full bg-[#714B67] text-white hover:bg-[#5f3e56]">
          <Link to="/settings/upgrade">
            <Lock className="mr-2 h-4 w-4" />
            {t("permissions.upgrade")}
          </Link>
        </Button>
      )}
    </article>
  );
}

function PermissionsSkeleton() {
  return (
    <div aria-hidden="true" className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-48 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-slate-200" />
              <div className="h-5 w-20 rounded bg-slate-100" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((__, item) => (
              <div key={item} className="h-7 rounded bg-slate-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
