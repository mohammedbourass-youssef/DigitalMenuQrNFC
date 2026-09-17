import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, ImageOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";

import type { AdminCategoryItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

interface CategoryDetailsRouteState {
  category?: AdminCategoryItem;
}

export default function CategoryDetailsPage() {
  const { i18n, t } = useTranslation();
  const { categoryId } = useParams();
  const location = useLocation();
  const category = (location.state as CategoryDetailsRouteState | null)?.category;

  if (!category) {
    return (
      <div dir={i18n.language === "ar" ? "rtl" : "ltr"} className="space-y-6">
        <Button variant="outline" asChild><Link to="/categories"><ArrowLeft />{t("categories.details.back")}</Link></Button>
        <Empty className="min-h-[420px] border border-dashed border-slate-300 bg-white">
          <EmptyHeader><EmptyMedia variant="icon"><ImageOff /></EmptyMedia><EmptyTitle>{t("categories.details.notFound")}</EmptyTitle><EmptyDescription>{t("categories.details.notFoundDescription", { id: categoryId })}</EmptyDescription></EmptyHeader>
          <Button asChild><Link to="/categories">{t("categories.details.back")}</Link></Button>
        </Empty>
      </div>
    );
  }

  const createdLabel = formatDistanceToNow(new Date(category.createdAt), { addSuffix: true });

  return (
    <div dir={i18n.language === "ar" ? "rtl" : "ltr"} className="space-y-6">
      <div>
        <Button variant="outline" asChild><Link to="/categories"><ArrowLeft />{t("categories.details.back")}</Link></Button>
      </div>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="h-56 w-full bg-slate-100">
          {category.imageUrl ? (
            <img src={category.imageUrl} alt={category.name || t("categories.details.imageAlt")} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400"><ImageOff className="h-12 w-12" aria-hidden="true" /></div>
          )}
        </div>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: category.color }} aria-label={category.color} />
              <CardTitle className="truncate text-2xl font-bold text-slate-900">{category.name || "—"}</CardTitle>
            </div>
            <Badge variant={category.isActive ? "default" : "destructive"}>{category.isActive ? t("categories.active") : t("categories.inactive")}</Badge>
          </div>
          <CardDescription className="whitespace-pre-line">{category.desc || t("categories.details.noDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("categories.details.name")}</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{category.name || "—"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("categories.details.color")}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: category.color }} aria-hidden="true" />
              <p className="text-sm font-medium text-slate-800">{category.color}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("categories.details.status")}</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{category.isActive ? t("categories.active") : t("categories.inactive")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("categories.details.createdAt")}</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{new Date(category.createdAt).toLocaleString()} ({createdLabel})</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}