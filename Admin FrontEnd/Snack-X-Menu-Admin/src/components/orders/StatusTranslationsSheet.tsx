import { useEffect, useRef, useState } from "react";
import { AlertCircle, Info, Languages, Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useOrderStatusTranslations } from "@/hooks/useOrderStatuses";
import { friendlyErrorMessage, readApiError, readErrorStatus } from "@/lib/apiErrors";
import type { OrderStatusItem, OrderStatusTranslationEntry } from "@/types";

export interface StatusTranslationsPayload {
  translations: OrderStatusTranslationEntry[];
}

interface StatusTranslationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: OrderStatusItem | null;
  onSubmit: (payload: StatusTranslationsPayload) => Promise<void>;
}

const NAME_MAX_LENGTH = 50;

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English (en)",
  fr: "Français (fr)",
  ar: "العربية (ar)",
  es: "Español (es)",
  it: "Italiano (it)",
  ja: "日本語 (ja)",
  zh: "中文 (zh)",
  ko: "한국어 (ko)",
  de: "Deutsch (de)",
};

export function StatusTranslationsSheet({
  open,
  onOpenChange,
  status,
  onSubmit,
}: StatusTranslationsSheetProps) {
  const { t } = useTranslation();
  const id = status?.id ?? null;
  const query = useOrderStatusTranslations(id);

  const [languageOrder, setLanguageOrder] = useState<string[]>([]);
  const [initialFields, setInitialFields] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [englishError, setEnglishError] = useState<string | null>(null);
  const initializedFor = useRef<string>("");

  useEffect(() => {
    if (!open) {
      initializedFor.current = "";
      setLoadError(null);
      setSaveError(null);
      setEnglishError(null);
      return;
    }
    if (query.isError) {
      setLoadError(friendlyErrorMessage(query.error, t("orders.translations.loadError")));
      return;
    }
    if (!query.data) return;

    const key = String(status?.id);
    if (initializedFor.current === key) return;
    initializedFor.current = key;

    const initial: Record<string, string> = {};
    const order: string[] = [];
    for (const entry of query.data.translations) {
      initial[entry.lang] = entry.name;
      order.push(entry.lang);
    }
    setLanguageOrder(order.includes("en") ? ["en", ...order.filter((l) => l !== "en")] : order);
    setInitialFields(initial);
    setFields(initial);
    setTouched({});
    setIsSubmitting(false);
    setLoadError(null);
    setSaveError(null);
    setEnglishError(null);
  }, [open, query.data, query.isError, query.error, status?.id, t]);

  const fieldError = (lang: string): string | null => {
    const value = (fields[lang] ?? "").trim();
    if (value.length === 0) return t("orders.translations.fieldRequired");
    if (value.length > NAME_MAX_LENGTH) {
      return t("orders.translations.fieldTooLong", { max: NAME_MAX_LENGTH });
    }
    return null;
  };

  const allValid = languageOrder.every((lang) => fieldError(lang) === null);
  const changedLanguages = languageOrder.filter(
    (lang) => (fields[lang] ?? "").trim() !== (initialFields[lang] ?? "").trim()
  );
  const englishChanged = changedLanguages.includes("en");

  const handleSave = async () => {
    if (isSubmitting) return;
    if (!allValid) {
      setTouched(Object.fromEntries(languageOrder.map((lang) => [lang, true])));
      return;
    }
    if (changedLanguages.length === 0) {
      onOpenChange(false);
      return;
    }
    setIsSubmitting(true);
    setSaveError(null);
    setEnglishError(null);
    try {
      await onSubmit({
        translations: changedLanguages.map((lang) => ({
          lang,
          name: (fields[lang] ?? "").trim(),
        })),
      });
    } catch (err) {
      const message = readApiError(err, t("orders.translations.toast.saveError"));
      if (readErrorStatus(err) === 400 && englishChanged) {
        setEnglishError(message);
      } else {
        setSaveError(message);
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-lg">
        <SheetHeader className="px-6 pb-4 pt-6">
          <SheetTitle className="flex items-center gap-2 text-xl font-bold">
            <Languages className="h-5 w-5 text-slate-400" />
            {status ? t("orders.translations.open", { name: status.name }) : ""}
          </SheetTitle>
          <SheetDescription>{t("orders.translations.description")}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loadError ? (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="font-semibold text-red-800">{loadError}</p>
              <Button variant="outline" onClick={() => void query.refetch()}>
                <RefreshCw />
                {t("orders.statuses.retry")}
              </Button>
            </div>
          ) : query.isPending ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-5">
              {saveError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {saveError}
                </div>
              )}

              {languageOrder.map((lang) => {
                const error = touched[lang] ? fieldError(lang) : null;
                return (
                  <div key={lang} className="space-y-2">
                    <Label
                      htmlFor={`status-translation-${lang}`}
                      className="text-sm font-medium text-slate-700"
                    >
                      {LANGUAGE_LABELS[lang] ?? lang}
                    </Label>
                    <Input
                      id={`status-translation-${lang}`}
                      dir={lang === "ar" ? "rtl" : "ltr"}
                      type="text"
                      value={fields[lang] ?? ""}
                      onChange={(e) =>
                        setFields((prev) => ({ ...prev, [lang]: e.target.value }))
                      }
                      onBlur={() =>
                        setTouched((prev) => ({ ...prev, [lang]: true }))
                      }
                      maxLength={NAME_MAX_LENGTH + 1}
                      disabled={isSubmitting}
                      className="h-11"
                      aria-invalid={!!error || (lang === "en" && !!englishError)}
                      aria-describedby={
                        error || (lang === "en" && englishError)
                          ? `translation-error-${lang}`
                          : undefined
                      }
                    />
                    {error && (
                      <p
                        id={`translation-error-${lang}`}
                        className="text-xs text-red-500"
                        role="alert"
                      >
                        {error}
                      </p>
                    )}
                    {lang === "en" && englishError && (
                      <p
                        id={`translation-error-en`}
                        className="text-xs text-red-500"
                        role="alert"
                      >
                        {englishError}
                      </p>
                    )}
                    {lang === "en" && (
                      <p className="flex items-start gap-1.5 text-xs text-slate-500">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                        <span>{t("orders.translations.enHint")}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-slate-100 px-6 py-4">
          <div className="flex w-full gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSubmitting || loadError !== null || query.isPending}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Languages className="me-2 h-4 w-4" />
              )}
              {t("orders.translations.saveButton")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}