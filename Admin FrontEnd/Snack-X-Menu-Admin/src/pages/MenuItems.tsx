import { useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  ShieldX,
  UtensilsCrossed,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Edit,
  Languages,
  MoreHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminMenuItems } from "@/hooks/useAdminMenuItems";
import { useRestaurantInfos } from "@/hooks/useRestaurantInfos";
import { useToast } from "@/hooks/use-toast";
import { friendlyErrorMessage } from "@/lib/apiErrors";
import { CURRENCIES, DEFAULT_CURRENCY_CODE } from "@/lib/currencies";
import { setCurrency } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import { activateMenuItem, deactivateMenuItem, getMenuItemInfoAdmin } from "@/services/menuService";
import type { AdminMenuItem, PagedResult } from "@/types/menuItem";
import { usePlanQuota } from "@/hooks/usePlanQuota";
import { QuotaUsage } from "@/components/plan/QuotaUsage";

const PAGE_SIZES = [10, 20, 50, 100] as const;

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
] as const;

const statusOf = (err: unknown): number | undefined => {
  if (typeof err === "object" && err !== null && "response" in err) {
    return (err as { response?: { status?: number } }).response?.status;
  }
  return undefined;
};

function formatPrice(value: number, language: string, currency: string): string {
  try {
    return new Intl.NumberFormat(language, { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export default function MenuItemsPage() {
  const { i18n, t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: quota } = usePlanQuota();
  const canAddMenuItem = quota?.menuItems.canAdd !== false;
  const navigate = useNavigate();
  const { data: restaurant, isLoading: restaurantPending } = useRestaurantInfos();
  const [searchParams, setSearchParams] = useSearchParams();

  const [imagesModalItem, setImagesModalItem] = useState<AdminMenuItem | null>(null);
  const [translationsModalItem, setTranslationsModalItem] = useState<AdminMenuItem | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const explicitRaw = (searchParams.get("currencyCode") ?? "").trim().toUpperCase();
  const explicitCurrency = (CURRENCIES as readonly string[]).includes(explicitRaw)
    ? explicitRaw
    : null;
  const restaurantCurrency = (restaurant?.currencyCode ?? "").trim().toUpperCase();
  const currencyCode =
    explicitCurrency ??
    ((CURRENCIES as readonly string[]).includes(restaurantCurrency)
      ? restaurantCurrency
      : DEFAULT_CURRENCY_CODE);
  const currencyLocked = explicitCurrency !== null || !restaurantPending;

  const langParam = searchParams.get("language") ?? i18n.language ?? "en";
  const language = LANGUAGES.some((entry) => entry.code === langParam) ? langParam : "en";

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const rawPageSize = Number(searchParams.get("pageSize")) || 20;
  const pageSize = (PAGE_SIZES as readonly number[]).includes(rawPageSize) ? rawPageSize : 20;

  useEffect(() => {
    if (!currencyLocked) return;
    setSearchParams(
      (current) => {
        if (!current.get("language")) current.set("language", i18n.language || "en");
        if (!current.get("currencyCode")) current.set("currencyCode", currencyCode);
        if (!current.get("page")) current.set("page", String(page));
        if (!current.get("pageSize")) current.set("pageSize", String(pageSize));
        return current;
      },
      { replace: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currencyLocked, currencyCode]);

  const queryKey = ["admin-menus", currencyCode, language, page, pageSize];
  const query = useAdminMenuItems({ currencyCode, language, page, pageSize }, currencyLocked);

  const status = statusOf(query.error);
  const isForbidden = status === 403;
  const errorMessage = query.error
    ? friendlyErrorMessage(query.error, t("menuItems.loadError"))
    : null;
  const totalCount = query.data?.totalCount ?? 0;
  const totalPages = query.data?.totalPages ?? 0;
  const hasNextPage = Boolean(query.data?.hasNextPage);
  const hasPreviousPage = Boolean(query.data?.hasPreviousPage);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setSearchParams((current) => {
        current.set("page", String(totalPages));
        return current;
      });
    }
  }, [totalPages, page, setSearchParams]);

  const changeCurrency = (next: string) => {
    setCurrency(next);
    setSearchParams((current) => {
      current.set("currencyCode", next);
      current.set("page", "1");
      return current;
    });
  };

  const changeLanguage = (next: string) => {
    void i18n.changeLanguage(next);
    setSearchParams((current) => {
      current.set("language", next);
      current.set("page", "1");
      return current;
    });
  };

  const changePageSize = (next: string) => {
    setSearchParams((current) => {
      current.set("pageSize", next);
      current.set("page", "1");
      return current;
    });
  };

  const changePage = (next: number) => {
    setSearchParams((current) => {
      current.set("page", String(next));
      return current;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleActive = async (item: AdminMenuItem) => {
    try {
      if (item.isActive) {
        await deactivateMenuItem(item.id);
        toast({ title: t("menuItems.toast.deactivateSuccess") });
      } else {
        await activateMenuItem(item.id);
        toast({ title: t("menuItems.toast.activateSuccess") });
      }

      queryClient.setQueryData<PagedResult<AdminMenuItem>>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((i) => (i.id === item.id ? { ...i, isActive: !i.isActive } : i)),
        };
      });
    } catch {
      toast({ variant: "destructive", title: t("menuItems.toast.error") });
    }
  };

  const handleOpenImages = (item: AdminMenuItem) => {
    navigate(`/menu-items/${item.id}/images`);
  };

  const handleOpenTranslations = (item: AdminMenuItem) => {
    navigate(`/menu-items/${item.id}/translations`);
  };

  return (
    <div dir={language === "ar" ? "rtl" : "ltr"} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-slate-900">{t("menuItems.title")}</h1>
          {query.data && (
            <Badge variant="secondary">{t("menuItems.totalResults", { count: totalCount })}</Badge>
          )}
          <QuotaUsage
            resource="menuItems"
            label={t("menuItems.title")}
            showLimitMessage
            limitMessage={t("planQuota.menuItemLimitReached", {
              display: quota?.menuItems.display ?? "—",
              defaultValue: `Menu item limit reached (${quota?.menuItems.display ?? "—"}).`,
            })}
          />
        </div>
         <Button onClick={() => navigate("/menu-items/new")} disabled={!canAddMenuItem}>
            <Plus />
            {t("menuItems.addItem")}
         </Button>
        </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">{t("menuItems.currency")}</Label>
            <Select value={currencyCode} onValueChange={changeCurrency} disabled={!currencyLocked}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">{t("menuItems.language")}</Label>
            <Select value={language} onValueChange={changeLanguage}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((entry) => (
                  <SelectItem key={entry.code} value={entry.code}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="relative">
          {(query.isFetching || isLoadingDetails) && (
            <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/50 pt-8 backdrop-blur-[1px]">
              <Spinner className="h-6 w-6 text-primary" />
            </div>
          )}

          {isForbidden ? (
            <div className="flex flex-col items-center gap-4 p-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <ShieldX className="h-6 w-6 text-red-600" />
              </span>
              <p className="font-semibold text-red-800">{t("menuItems.accessDenied")}</p>
              <p className="text-sm text-red-600">{t("menuItems.accessDeniedDescription")}</p>
            </div>
          ) : query.isPending ? (
            <MenuItemsTableSkeleton rows={Math.min(pageSize, 8)} />
          ) : query.isError ? (
            <div className="flex flex-col items-center gap-4 p-10 text-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="font-semibold text-red-800">{errorMessage}</p>
              <Button variant="outline" onClick={() => void query.refetch()}>
                <RefreshCw />
                {t("menuItems.retry")}
              </Button>
            </div>
          ) : query.data && query.data.items.length === 0 ? (
            <Empty className="min-h-[360px] border border-dashed border-slate-300 bg-white">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UtensilsCrossed />
                </EmptyMedia>
                <EmptyTitle>{t("menuItems.noItemsTitle")}</EmptyTitle>
                <EmptyDescription>{t("menuItems.noItemsDescription")}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => navigate("/menu-items/new")} disabled={!canAddMenuItem}>
                    <Plus />
                    {t("menuItems.addItem")}
                </Button>
              </EmptyContent>
            </Empty>
          ) : query.data ? (
            <MenuItemsTable
              items={query.data.items}
              language={language}
              onToggleActive={handleToggleActive}
              onViewImages={handleOpenImages}
              onViewTranslations={handleOpenTranslations}
              onEdit={(item) => navigate(`/menu-items/${item.id}/edit`)}
            />
          ) : null}
        </div>

        {query.data && query.data.totalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-500">
                {t("menuItems.pageOf", { page, totalPages })}
                <span className="mx-1.5 text-slate-300">•</span>
                {t("menuItems.totalResults", { count: totalCount })}
              </p>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-500">{t("menuItems.pageSize")}</Label>
                <Select value={String(pageSize)} onValueChange={changePageSize}>
                  <SelectTrigger className="h-8 w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(page - 1)}
                disabled={!hasPreviousPage}
              >
                <ChevronLeft className="rtl:rotate-180" />
                {t("menuItems.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(page + 1)}
                disabled={!hasNextPage}
              >
                {t("menuItems.next")}
                <ChevronRight className="rtl:rotate-180" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Translations Modal removed in favor of dedicated route */}
    </div>
  );
}

function MenuItemsTable({
  items,
  language,
  onToggleActive,
  onViewImages,
  onViewTranslations,
  onEdit,
}: {
  items: AdminMenuItem[];
  language: string;
  onToggleActive: (item: AdminMenuItem) => void;
  onViewImages: (item: AdminMenuItem) => void;
  onViewTranslations: (item: AdminMenuItem) => void;
  onEdit: (item: AdminMenuItem) => void;
}) {
  const { t } = useTranslation();

  return (
    <Table className="min-w-[820px] [&_th]:text-start">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{t("menuItems.columns.name")}</TableHead>
          <TableHead>{t("menuItems.columns.sku")}</TableHead>
          <TableHead>{t("menuItems.columns.price")}</TableHead>
          <TableHead>{t("menuItems.columns.discountedPrice")}</TableHead>
          <TableHead>{t("menuItems.columns.prepTime")}</TableHead>
          <TableHead>{t("menuItems.columns.status")}</TableHead>
          <TableHead className="text-end">{t("menuItems.columns.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            className="cursor-pointer hover:bg-slate-50/70"
            onClick={() => void onViewImages(item)}
          >
            <TableCell onClick={(e) => e.stopPropagation()}>
              <div
                className="flex min-w-0 flex-col gap-0.5 cursor-pointer"
                onClick={() => void onViewImages(item)}
              >
                <span
                  className={cn(
                    "font-medium text-slate-900 hover:text-primary transition-colors",
                    !item.name && "italic text-slate-400"
                  )}
                >
                  {item.name || t("menuItems.noTranslation")}
                </span>
                {item.descriptions && (
                  <span className="line-clamp-1 w-56 whitespace-nowrap text-xs text-slate-500">
                    {item.descriptions}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <span className="whitespace-nowrap font-mono text-xs text-slate-600">
                {item.sku || "—"}
              </span>
            </TableCell>
            <TableCell>
              <span className="whitespace-nowrap font-semibold text-slate-900">
                {formatPrice(item.price, language, item.currency)}
              </span>
            </TableCell>
            <TableCell>
              {item.discountedPrice != null ? (
                <span className="whitespace-nowrap font-medium text-emerald-600">
                  {formatPrice(item.discountedPrice, language, item.currency)}
                </span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </TableCell>
            <TableCell>
              <span className="whitespace-nowrap text-slate-600">
                {item.preparationTimeMinutes > 0
                  ? t("menuItems.minutes", { count: item.preparationTimeMinutes })
                  : "—"}
              </span>
            </TableCell>
            <TableCell>
              <StatusBadges item={item} />
            </TableCell>
            <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => void onViewImages(item)}>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {t("menuItems.actions.viewImages")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void onViewTranslations(item)}>
                    <Languages className="mr-2 h-4 w-4" />
                    {t("menuItems.actions.translations")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Edit className="mr-2 h-4 w-4" />
                    {t("menuItems.actions.update")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleActive(item)}>
                    {item.isActive ? (
                      <>
                        <XCircle className="mr-2 h-4 w-4 text-red-600" />
                        <span className="text-red-600">{t("menuItems.actions.deactivate")}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                        <span className="text-emerald-600">{t("menuItems.actions.activate")}</span>
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatusBadges({ item }: { item: AdminMenuItem }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={item.isActive ? "default" : "destructive"}>
        {item.isActive ? t("menuItems.badges.active") : t("menuItems.badges.inactive")}
      </Badge>
      <Badge
        variant="outline"
        className={cn(
          item.isAvailable
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-50 text-slate-400"
        )}
      >
        {item.isAvailable ? t("menuItems.badges.available") : t("menuItems.badges.unavailable")}
      </Badge>
      {item.isFeatured && (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
          {t("menuItems.badges.featured")}
        </Badge>
      )}
    </div>
  );
}

function MenuItemsTableSkeleton({ rows }: { rows: number }) {
  const { t } = useTranslation();

  return (
    <Table className="min-w-[820px] [&_th]:text-start">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{t("menuItems.columns.name")}</TableHead>
          <TableHead>{t("menuItems.columns.sku")}</TableHead>
          <TableHead>{t("menuItems.columns.price")}</TableHead>
          <TableHead>{t("menuItems.columns.discountedPrice")}</TableHead>
          <TableHead>{t("menuItems.columns.prepTime")}</TableHead>
          <TableHead>{t("menuItems.columns.status")}</TableHead>
          <TableHead className="text-end">{t("menuItems.columns.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }, (_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            <TableCell>
              <Skeleton className="h-5 w-48 max-w-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-14" />
            </TableCell>
            <TableCell>
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </TableCell>
            <TableCell className="text-end">
              <Skeleton className="h-8 w-8 ml-auto rounded-md" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
