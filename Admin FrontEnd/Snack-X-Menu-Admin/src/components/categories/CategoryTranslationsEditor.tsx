import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { CATEGORY_LANGUAGES } from "./categoryLanguages";
import { updateCategoryLanguages } from "@/services/categoryService";

export type EditedTranslations = Record<string, { name: string; description: string }>;

interface CategoryTranslationsEditorProps {
  categoryId: string;
  languages: string[];
  initialTranslations: EditedTranslations;
  secondaryLabel: string;
  onSecondaryClick: () => void;
  onSaveSuccess: (edited: EditedTranslations) => void;
  onSavingChange?: (saving: boolean) => void;
}

export function CategoryTranslationsEditor({
  categoryId,
  languages,
  initialTranslations,
  secondaryLabel,
  onSecondaryClick,
  onSaveSuccess,
  onSavingChange,
}: CategoryTranslationsEditorProps) {
  const { i18n, t } = useTranslation();
  const [edits, setEdits] = useState<EditedTranslations>(initialTranslations);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEdit = (lang: string, field: "name" | "description", value: string) => {
    setEdits((prev) => ({
      ...prev,
      [lang]: { ...prev[lang], [field]: value },
    }));
  };

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setErrorMessage(null);
    onSavingChange?.(true);

    try {
      const translations: Record<string, { name: string; description?: string }> = {};
      for (const [lang, edited] of Object.entries(edits)) {
        translations[lang] = {
          name: edited.name,
          ...(edited.description ? { description: edited.description } : {}),
        };
      }

      await updateCategoryLanguages({ categoryId, translations });

      toast.success(t("categories.translations.updateSuccess"));
      onSaveSuccess(edits);
    } catch (err: unknown) {
      let message = t("categories.translations.updateError");
      if (
        err instanceof Object &&
        "response" in err &&
        err.response instanceof Object &&
        "data" in err.response &&
        err.response.data instanceof Object &&
        "error" in err.response.data &&
        typeof err.response.data.error === "string"
      ) {
        message = err.response.data.error;
      }
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  }, [saving, edits, categoryId, t, onSaveSuccess, onSavingChange]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-6 pb-6">
        {languages.map((lang) => {
          const meta = CATEGORY_LANGUAGES[lang] ?? { label: lang, flag: "" };
          const edited = edits[lang];
          const hasDescription = edited?.description !== "";

          return (
            <div key={lang} className="rounded-xl border border-slate-200 p-4">
              <p className="mb-3 text-sm font-medium text-slate-700">
                {meta.flag} {meta.label}
              </p>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-500">
                    {t("categories.translations.name")}
                  </Label>
                  <Input
                    value={edited?.name ?? ""}
                    onChange={(e) => handleEdit(lang, "name", e.target.value)}
                    disabled={saving}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">
                    {t("categories.translations.description")}
                  </Label>
                  {hasDescription ? (
                    <Textarea
                      value={edited?.description ?? ""}
                      onChange={(e) =>
                        handleEdit(lang, "description", e.target.value)
                      }
                      rows={2}
                      disabled={saving}
                      className="mt-1 resize-none text-sm"
                    />
                  ) : (
                    <p className="mt-1 text-xs italic text-slate-400">
                      {t("categories.translations.noDescription")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-100 px-6 py-4">
        {errorMessage && (
          <div
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage}
          </div>
        )}
        <div className="flex w-full gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onSecondaryClick}
            disabled={saving}
            className="flex-1"
          >
            {secondaryLabel}
          </Button>
          <Button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={saving}
            className="flex-1 bg-orange-500 hover:bg-orange-600"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("categories.translations.update")}
          </Button>
        </div>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent dir={i18n.language === "ar" ? "rtl" : "ltr"} className="max-h-[85vh] overflow-y-auto break-words text-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("categories.translations.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">{t("categories.translations.confirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setShowConfirm(false)}>{t("common.cancel")}</Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              disabled={saving}
              onClick={() => {
                setShowConfirm(false);
                void handleSave();
              }}
            >
              {t("categories.translations.confirmButton")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}