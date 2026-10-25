import { useEffect, useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast as sonnerToast } from "sonner";
import { Link } from "react-router-dom";

import { useAdminCategories } from "@/hooks/useAdminCategories";
import { useToast } from "@/hooks/use-toast";
import { deactivateCategory, activateCategory } from "@/services/categoryService";
import { CategoryCard } from "@/components/categories/CategoryCard";
import { CategoryCardSkeleton } from "@/components/categories/CategoryCardSkeleton";
import { CategoriesPagination } from "@/components/categories/CategoriesPagination";
import { AddCategorySheet } from "@/components/categories/AddCategorySheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import type { AdminCategoryItem, AdminCategoryResponse } from "@/types";
import { PLAN_QUOTA_QUERY_KEY, usePlanQuota } from "@/hooks/usePlanQuota";
import { QuotaUsage } from "@/components/plan/QuotaUsage";
import { categoryLimitReachedMessage, getCategoryApiError, refreshCategoryQuotaAndList } from "@/lib/categoryQuotaErrors";

const PAGE_COUNT_DEFAULT = 8;

export default function CategoriesPage() {
  const { i18n, t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: quota } = usePlanQuota();
  const canAddCategory = quota?.categories.canAdd !== false;
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const lang = searchParams.get("lang") || i18n.language || "en";
  const pageNumber = Math.max(1, Number(searchParams.get("pageNumber")) || 1);
  const pageCount = Math.max(1, Number(searchParams.get("pageCount")) || PAGE_COUNT_DEFAULT);
  const query = useAdminCategories(lang, pageNumber, pageCount);
  const status = query.error && "response" in query.error
    ? (query.error.response as { status?: number } | undefined)?.status
    : undefined;

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: PLAN_QUOTA_QUERY_KEY });
  }, [queryClient]);

  useEffect(() => {
    if (!searchParams.get("lang")) {
      setSearchParams((current) => {
        current.set("lang", i18n.language || "en");
        current.set("pageNumber", String(pageNumber));
        current.set("pageCount", String(pageCount));
        return current;
      }, { replace: true });
    }
  }, [i18n.language, pageCount, pageNumber, searchParams, setSearchParams]);

  useEffect(() => {
    if (status === 400) toast({ variant: "destructive", title: t("categories.validationError") });
    if (status === 500) toast({ variant: "destructive", title: t("categories.serverError") });
  }, [status, t, toast]);

  const changePage = (nextPage: number) => {
    setSearchParams((current) => {
      current.set("lang", lang);
      current.set("pageNumber", String(nextPage));
      current.set("pageCount", String(pageCount));
      return current;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeLanguage = (nextLang: string) => {
    void i18n.changeLanguage(nextLang);
    setSearchParams((current) => {
      current.set("lang", nextLang);
      current.set("pageNumber", "1");
      current.set("pageCount", String(pageCount));
      return current;
    });
  };

  const queryKey = ["admin-categories", lang, pageNumber, pageCount] as const;

  const statusOf = (err: unknown): number | undefined => {
    if (typeof err === "object" && err !== null && "response" in err) {
      return (err as { response?: { status?: number } }).response?.status;
    }
    return undefined;
  };

  const showToggleError = (err: unknown, kind: "activate" | "deactivate") => {
    const status = statusOf(err);
    let message = t(`categories.${kind}.toastErrorGeneric`);
    if (status === 403) message = t(`categories.${kind}.toastErrorForbidden`);
    else if (status === 404) message = t(`categories.${kind}.toastErrorNotFound`);
    toast({ variant: "destructive", title: message });
    throw err;
  };

  const flipIsActive = (categoryId: string, isActive: boolean) => {
    queryClient.setQueryData<AdminCategoryResponse>(queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.map((c) => (c.id === categoryId ? { ...c, isActive } : c)),
      };
    });
  };

  const handleDeactivate = async (category: AdminCategoryItem) => {
    try {
      await deactivateCategory(category.id);
      flipIsActive(category.id, false);
      void queryClient.invalidateQueries({ queryKey: PLAN_QUOTA_QUERY_KEY });
      toast({ title: t("categories.deactivate.toastSuccess") });
    } catch (err: unknown) {
      showToggleError(err, "deactivate");
    }
  };

  const handleActivate = async (category: AdminCategoryItem) => {
    try {
      await activateCategory(category.id);
      flipIsActive(category.id, true);
      void queryClient.invalidateQueries({ queryKey: PLAN_QUOTA_QUERY_KEY });
      toast({ title: t("categories.activate.toastSuccess") });
    } catch (err: unknown) {
      const apiError = getCategoryApiError(err);
      if (apiError?.code === "CATEGORY_LIMIT_REACHED") {
        refreshCategoryQuotaAndList(queryClient);
        void query.refetch();
        toast({
          variant: "destructive",
          title: categoryLimitReachedMessage(apiError.current, apiError.limit),
        });
        return;
      }
      if (apiError?.code === "CATEGORY_ALREADY_ACTIVE") {
        refreshCategoryQuotaAndList(queryClient);
        void query.refetch();
        sonnerToast.info(t("categories.activate.alreadyActive", { defaultValue: "This category is already active." }));
        return;
      }
      if (apiError?.code === "PLAN_NOT_FOUND") {
        toast({ variant: "destructive", title: t("categories.planNotFound", { defaultValue: "Your plan could not be found. Contact support." }) });
        return;
      }
      showToggleError(err, "activate");
    }
  };

  const isEmpty = !query.isLoading && !query.data?.data?.length;

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="space-y-6">
      <div className="sticky top-[73px] z-10 -mx-6 border-b border-slate-200 bg-background/95 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-slate-900">{t("categories.title")}</h1>
            <Badge variant="secondary">{t("categories.total", { count: query.data?.meta?.totalCount ?? 0 })}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-slate-200 bg-white p-1" role="group" aria-label="Language">
              {["en", "ar", "fr"].map((option) => (
                <button key={option} type="button" onClick={() => changeLanguage(option)} className={`rounded-md px-3 py-1 text-xs font-bold uppercase transition ${lang === option ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`} aria-pressed={lang === option}>{option}</button>
              ))}
            </div>
            <Button onClick={() => setShowAddSheet(true)} disabled={!canAddCategory}><Plus />{t("categories.add")}</Button>
          </div>
        </div>
        <div className="mt-2 flex justify-end"><QuotaUsage resource="categories" label={t("categories.title")} showLimitMessage limitMessage={t("categories.quota.limitReached", { display: quota?.categories.display ?? "—", defaultValue: `Category limit reached (${quota?.categories.display ?? "—"}). Upgrade your plan.` })} /></div>
      </div>

      {status === 404 ? (
        <Alert variant="destructive"><AlertCircle /><AlertTitle>{t("categories.accountNotFound")}</AlertTitle><AlertDescription>{t("categories.accountNotFoundDescription")}</AlertDescription></Alert>
      ) : query.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <CategoryCardSkeleton key={index} />)}</div>
      ) : isEmpty ? (
        <Empty className="min-h-[420px] border border-dashed border-slate-300 bg-white"><EmptyHeader><EmptyMedia variant="icon"><Plus /></EmptyMedia><EmptyTitle>{t("categories.empty_title")}</EmptyTitle><EmptyDescription>{t("categories.empty_sub")}</EmptyDescription></EmptyHeader><EmptyContent><Button onClick={() => setShowAddSheet(true)} disabled={!canAddCategory}>{t("categories.add")}</Button>{!canAddCategory && quota?.categories.max !== null && <p className="text-xs text-amber-800">{t("categories.quota.limitReached", { display: quota?.categories.display ?? "—", defaultValue: `Category limit reached (${quota?.categories.display ?? "—"}). Upgrade your plan.` })}{" "}<Link to="/settings/upgrade" className="font-semibold underline">{t("planQuota.upgrade", { defaultValue: "Upgrade your plan" })}</Link></p>}</EmptyContent></Empty>
      ) : query.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-10 text-center"><p className="font-semibold text-red-800">{t("categories.serverError")}</p><Button variant="outline" onClick={() => void query.refetch()}>{t("categories.retry")}</Button></div>
      ) : (
        <div className="relative">{query.isFetching && <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/50 pt-8 backdrop-blur-[1px]"><Spinner className="h-6 w-6 text-primary" /></div>}<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{query.data?.data?.map((category) => <CategoryCard key={category.id} category={category} activeLabel={t("categories.active")} inactiveLabel={t("categories.inactive")} createdLabel={(time) => t("categories.created", { time })} canActivate={canAddCategory} quotaDisplay={quota?.categories.display ?? "—"} onDeactivate={handleDeactivate} onActivate={handleActivate} />)}</div></div>
      )}

      {(query.data?.meta?.totalCount ?? 0) > 0 && <CategoriesPagination pageNumber={pageNumber} pageCount={pageCount} totalCount={query.data!.meta.totalCount} hasMore={query.data!.meta.hasMore} showingLabel={t("categories.showing")} onPageChange={changePage} />}
      <AddCategorySheet open={showAddSheet} onOpenChange={setShowAddSheet} onCreated={() => void query.refetch()} onCategoryCreated={() => void query.refetch()} />
    </div>
  );
}
