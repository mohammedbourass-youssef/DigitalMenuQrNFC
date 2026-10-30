import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Globe, ImageOff, Loader2, Palette } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { usePermissions } from "@/contexts/PermissionsContext";
import { getCategoryInfoAdmin, updateCategoryDisplay } from "@/services/categoryService";
import type { CategoryAdminInfo } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ColorPickerField } from "@/components/categories/ColorPickerField";
import { DisplayOrderStepper } from "@/components/categories/DisplayOrderStepper";
import {
  CategoryTranslationsEditor,
  type EditedTranslations,
} from "@/components/categories/CategoryTranslationsEditor";

const statusOf = (err: unknown): number | undefined => {
  if (typeof err === "object" && err !== null && "response" in err) {
    return (err as { response?: { status?: number } }).response?.status;
  }
  return undefined;
};

const languageLabel = (lang: string, displayLang: string): string => {
  try {
    return new Intl.DisplayNames([displayLang], { type: "language" }).of(lang) ?? lang;
  } catch {
    return lang;
  }
};

const serverErrorMessage = (err: unknown, fallback: string): string => {
  if (
    err instanceof Object &&
    "response" in err &&
    err.response instanceof Object &&
    "data" in err.response &&
    err.response.data instanceof Object &&
    "error" in err.response.data &&
    typeof err.response.data.error === "string"
  ) {
    return err.response.data.error;
  }
  return fallback;
};

export default function CategoryDetailsPage() {
  const { i18n, t } = useTranslation();
  const { can } = usePermissions();
  const canEdit = can("Categories", "edit");
  const { categoryId } = useParams<{ categoryId: string }>();
  const queryClient = useQueryClient();
  const [imageFailed, setImageFailed] = useState(false);
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  // ── Update Color & Order state ──
  const [colorEditOpen, setColorEditOpen] = useState(false);
  const [colorDraft, setColorDraft] = useState("");
  const [orderDraft, setOrderDraft] = useState(1);
  const [displaySaving, setDisplaySaving] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(null);

  // ── Update Languages state ──
  const [translationsOpen, setTranslationsOpen] = useState(false);

  const queryKey = ["admin-category-info", categoryId] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => getCategoryInfoAdmin(categoryId ?? ""),
    enabled: Boolean(categoryId),
    retry: 0,
  });

  const status = statusOf(query.error);

  const patchLocal = (patch: Partial<CategoryAdminInfo>) => {
    queryClient.setQueryData<CategoryAdminInfo>(queryKey, (old) =>
      old ? { ...old, ...patch } : old
    );
  };

  if (query.isLoading) {
    return (
      <div dir={dir} className="space-y-6">
        <Button variant="outline" asChild><Link to="/categories"><ArrowLeft />{t("categories.details.back")}</Link></Button>
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
          <div className="flex h-72 items-center justify-center bg-slate-50"><Spinner className="h-8 w-8 text-primary" /></div>
        </Card>
      </div>
    );
  }

  if (query.isError || !query.data) {
    if (status === 404) {
      return (
        <div dir={dir} className="space-y-6">
          <Button variant="outline" asChild><Link to="/categories"><ArrowLeft />{t("categories.details.back")}</Link></Button>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-10 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="font-semibold text-red-800">{t("categories.details.notFound")}</p>
            <p className="text-sm text-red-600">{t("categories.details.notFoundDescription", { id: categoryId })}</p>
            <Button asChild><Link to="/categories">{t("categories.details.back")}</Link></Button>
          </div>
        </div>
      );
    }
    return (
      <div dir={dir} className="space-y-6">
        <Button variant="outline" asChild><Link to="/categories"><ArrowLeft />{t("categories.details.back")}</Link></Button>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-10 text-center">
          <p className="font-semibold text-red-800">{t("categories.details.loadError")}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>{t("categories.retry")}</Button>
        </div>
      </div>
    );
  }

  const category = query.data;

  const openColorOrder = () => {
    setColorDraft(category.color);
    setOrderDraft(category.displayOrder);
    setDisplayError(null);
    setColorEditOpen(true);
  };

  const handleDisplaySubmit = async () => {
    if (displaySaving) return;
    setDisplaySaving(true);
    setDisplayError(null);
    try {
      await updateCategoryDisplay(category.id, colorDraft, orderDraft);
      patchLocal({ color: colorDraft, displayOrder: orderDraft });
      setColorEditOpen(false);
      toast.success(t("categories.details.displayUpdateSuccess"));
    } catch (err: unknown) {
      const message = serverErrorMessage(err, t("categories.details.displayUpdateError"));
      setDisplayError(message);
      toast.error(message);
    } finally {
      setDisplaySaving(false);
    }
  };

  const translationLanguages = category.translations.map((tr) => tr.lang).sort();
  const initialTranslationValues: EditedTranslations = {};
  for (const tr of category.translations) {
    initialTranslationValues[tr.lang] = { name: tr.name, description: tr.description ?? "" };
  }

  const handleTranslationsSaved = (edited: EditedTranslations) => {
    const newTranslations = category.translations.map((tr) =>
      edited[tr.lang]
        ? { ...tr, name: edited[tr.lang].name, description: edited[tr.lang].description || null }
        : tr
    );
    patchLocal({ translations: newTranslations });
    setTranslationsOpen(false);
  };

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" asChild><Link to="/categories"><ArrowLeft />{t("categories.details.back")}</Link></Button>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={openColorOrder}><Palette />{t("categories.details.updateColorOrder")}</Button>
            <Button variant="outline" onClick={() => setTranslationsOpen(true)}><Globe />{t("categories.details.updateLanguages")}</Button>
          </div>
        )}
      </div>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="h-56 w-full bg-slate-100">
          {category.imageUrl && !imageFailed ? (
            <img src={category.imageUrl} alt={t("categories.details.imageAlt")} onError={() => setImageFailed(true)} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400"><ImageOff className="h-12 w-12" aria-hidden="true" /></div>
          )}
        </div>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: category.color }} aria-label={category.color} />
              <CardTitle className="truncate text-2xl font-bold text-slate-900">{category.translations.find((tr) => tr.lang === i18n.language)?.name || category.translations[0]?.name || "—"}</CardTitle>
            </div>
            <Badge variant={category.isActive ? "default" : "destructive"}>{category.isActive ? t("categories.active") : t("categories.inactive")}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("categories.details.color")}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: category.color }} aria-hidden="true" />
                <p className="text-sm font-medium text-slate-800">{category.color}</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("categories.details.displayOrder")}</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{category.displayOrder}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("categories.details.status")}</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{category.isActive ? t("categories.active") : t("categories.inactive")}</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <Globe className="h-4 w-4" />{t("categories.details.translations")}
            </h3>
            {category.translations.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {category.translations.map((translation) => (
                  <div key={translation.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {languageLabel(translation.lang, i18n.language)} <span className="ms-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{translation.lang}</span>
                    </p>
                    <p className="text-sm font-semibold text-slate-900">{translation.name || "—"}</p>
                    {translation.description ? (
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-500">{translation.description}</p>
                    ) : (
                      <p className="mt-1 text-sm italic text-slate-400">{t("categories.details.noDescription")}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-slate-400">{t("categories.details.translationsEmpty")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Update Color & Order */}
      <Dialog open={colorEditOpen} onOpenChange={(open) => { if (!displaySaving) setColorEditOpen(open); }}>
        <DialogContent dir={dir} className="max-h-[85vh] overflow-y-auto break-words text-slate-900">
          <DialogHeader>
            <DialogTitle>{t("categories.details.editColorOrderTitle")}</DialogTitle>
            <DialogDescription>{t("categories.details.editColorOrderDescription")}</DialogDescription>
          </DialogHeader>
          {displayError && (
            <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {displayError}
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">{t("categories.details.color")}</Label>
            <ColorPickerField value={colorDraft} onChange={setColorDraft} disabled={displaySaving} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">{t("categories.details.displayOrder")}</Label>
            <DisplayOrderStepper value={orderDraft} onChange={setOrderDraft} disabled={displaySaving} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={displaySaving} onClick={() => setColorEditOpen(false)}>{t("common.cancel")}</Button>
            <Button type="button" disabled={displaySaving} onClick={() => void handleDisplaySubmit()}>
              {displaySaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Languages */}
      <Dialog open={translationsOpen} onOpenChange={setTranslationsOpen}>
        <DialogContent dir={dir} className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 text-slate-900 sm:max-w-xl">
          <DialogHeader className="px-6 pb-4 pr-12 pt-6">
            <DialogTitle>{t("categories.details.editTranslationsTitle")}</DialogTitle>
            <DialogDescription>{t("categories.details.editTranslationsDescription")}</DialogDescription>
          </DialogHeader>
          <CategoryTranslationsEditor
            key={category.id}
            categoryId={category.id}
            languages={translationLanguages}
            initialTranslations={initialTranslationValues}
            secondaryLabel={t("common.cancel")}
            onSecondaryClick={() => setTranslationsOpen(false)}
            onSaveSuccess={handleTranslationsSaved}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}