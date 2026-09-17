import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Sparkles, Globe, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";

import { ImageUploadField } from "./ImageUploadField";
import { ColorPickerField } from "./ColorPickerField";
import { CategoryPreviewCard } from "./CategoryPreviewCard";
import { DisplayOrderStepper } from "./DisplayOrderStepper";
import { createCategory, updateCategoryLanguages } from "@/services/categoryService";
import type { CreateCategoryResponse } from "@/types";

type SubmitStatus = "idle" | "submitting" | "success" | "error";
type UpdateStatus = "idle" | "updating" | "success" | "error";

interface AddCategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  onCategoryCreated?: (categoryId: string) => void;
}

const DEFAULT_COLOR = "#94a3b8";
const NAME_MAX_LENGTH = 50;
const DESC_MAX_LENGTH = 300;

const LANGUAGES: Record<string, { label: string; flag: string }> = {
  en: { label: "English", flag: "🇬🇧" },
  fr: { label: "French", flag: "🇫🇷" },
  ar: { label: "Arabic", flag: "🇸🇦" },
  es: { label: "Spanish", flag: "🇪🇸" },
  de: { label: "German", flag: "🇩🇪" },
  "zh-Hans": { label: "Chinese (Simplified)", flag: "🇨🇳" },
  pt: { label: "Portuguese", flag: "🇵🇹" },
  ja: { label: "Japanese", flag: "🇯🇵" },
};

export function AddCategorySheet({
  open,
  onOpenChange,
  onCreated,
  onCategoryCreated,
}: AddCategorySheetProps) {
  const { t } = useTranslation();

  // ── Form fields ──
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [nameTouched, setNameTouched] = useState(false);

  // ── Submit state ──
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Translation update state ──
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [updateErrorMessage, setUpdateErrorMessage] = useState<string | null>(null);
  const updateAbortRef = useRef<AbortController | null>(null);

  // ── Translations review state ──
  const [createdCategoryId, setCreatedCategoryId] = useState<string | null>(null);
  const [serverTranslations, setServerTranslations] = useState<CreateCategoryResponse | null>(null);
  const [editedTranslations, setEditedTranslations] = useState<
    Record<string, { name: string; description: string }>
  >({});

  const nameError =
    nameTouched && name.trim().length === 0
      ? t("categories.form.nameRequired")
      : nameTouched && name.trim().length > NAME_MAX_LENGTH
        ? t("categories.form.nameTooLong")
        : null;

  const isNameValid = name.trim().length > 0 && name.trim().length <= NAME_MAX_LENGTH;
  const isSubmitting = submitStatus === "submitting";
  const isUpdating = updateStatus === "updating";
  const canSubmit = isNameValid && !isSubmitting;

  // Sync image preview with file
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setImagePreview(null);
  }, [imageFile]);

  // Reset form when sheet closes
  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setColor(DEFAULT_COLOR);
      setImageFile(null);
      setDisplayOrder(1);
      setNameTouched(false);
      setSubmitStatus("idle");
      setErrorMessage(null);
      setUpdateStatus("idle");
      setUpdateErrorMessage(null);
      setCreatedCategoryId(null);
      setServerTranslations(null);
      setEditedTranslations({});
      abortRef.current?.abort();
      abortRef.current = null;
      updateAbortRef.current?.abort();
      updateAbortRef.current = null;
    }
  }, [open]);

  // Cancel in-flight requests if sheet closes
  useEffect(() => {
    if (!open) {
      if (isSubmitting) {
        abortRef.current?.abort();
        abortRef.current = null;
      }
      if (isUpdating) {
        updateAbortRef.current?.abort();
        updateAbortRef.current = null;
      }
    }
  }, [open, isSubmitting, isUpdating]);

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setColor(DEFAULT_COLOR);
    setImageFile(null);
    setDisplayOrder(1);
    setNameTouched(false);
    setSubmitStatus("idle");
    setErrorMessage(null);
    setUpdateStatus("idle");
    setUpdateErrorMessage(null);
    setCreatedCategoryId(null);
    setServerTranslations(null);
    setEditedTranslations({});
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  const handleSheetOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && (isSubmitting || isUpdating)) return;
      if (!nextOpen) {
        resetForm();
      }
      onOpenChange(nextOpen);
    },
    [isSubmitting, isUpdating, resetForm, onOpenChange]
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setSubmitStatus("submitting");
    setErrorMessage(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await createCategory(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          image: imageFile ?? undefined,
          displayOrder,
        },
        controller.signal
      );

      setCreatedCategoryId(result.categoryId);
      setServerTranslations(result);

      const initial: Record<string, { name: string; description: string }> = {};
      const allLangs = new Set([
        ...Object.keys(result.names),
        ...Object.keys(result.descriptions),
      ]);
      for (const lang of allLangs) {
        initial[lang] = {
          name: result.names[lang] ?? "",
          description: result.descriptions[lang] ?? "",
        };
      }
      setEditedTranslations(initial);

      setSubmitStatus("success");
      toast.success(t("categories.toast.createSuccess"));
      onCreated?.();
      onCategoryCreated?.(result.categoryId);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;

      let message = t("categories.toast.createError");
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
      setSubmitStatus("error");
      toast.error(message);
    } finally {
      abortRef.current = null;
    }
  }, [
    canSubmit,
    name,
    description,
    color,
    imageFile,
    displayOrder,
    t,
    onCreated,
    onCategoryCreated,
  ]);

  const handleTranslationEdit = (lang: string, field: "name" | "description", value: string) => {
    setEditedTranslations((prev) => ({
      ...prev,
      [lang]: { ...prev[lang], [field]: value },
    }));
  };

  const handleSkip = useCallback(() => {
    if (createdCategoryId) {
      onCategoryCreated?.(createdCategoryId);
    }
    onCreated?.();
    resetForm();
    onOpenChange(false);
  }, [createdCategoryId, onCategoryCreated, onCreated, resetForm, onOpenChange]);

  const handleUpdateTranslations = useCallback(async () => {
    if (!createdCategoryId || isUpdating) return;

    setUpdateStatus("updating");
    setUpdateErrorMessage(null);

    const controller = new AbortController();
    updateAbortRef.current = controller;

    try {
      const translations: Record<string, { name: string; description?: string }> = {};
      for (const [lang, edited] of Object.entries(editedTranslations)) {
        translations[lang] = {
          name: edited.name,
          ...(edited.description ? { description: edited.description } : {}),
        };
      }

      await updateCategoryLanguages(
        { categoryId: createdCategoryId, translations },
        controller.signal
      );

      setUpdateStatus("success");
      toast.success(t("categories.translations.updateSuccess"));
      onCategoryCreated?.(createdCategoryId);
      onCreated?.();
      resetForm();
      onOpenChange(false);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;

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

      setUpdateErrorMessage(message);
      setUpdateStatus("error");
      toast.error(message);
    } finally {
      updateAbortRef.current = null;
    }
  }, [
    createdCategoryId,
    isUpdating,
    editedTranslations,
    t,
    onCategoryCreated,
    onCreated,
    resetForm,
    onOpenChange,
  ]);

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSubmit) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const allTranslationLangs = serverTranslations
    ? Array.from(
        new Set([
          ...Object.keys(serverTranslations.names),
          ...Object.keys(serverTranslations.descriptions),
        ])
      ).sort()
    : [];

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="flex flex-col w-full sm:max-w-lg p-0">
        {submitStatus === "success" && serverTranslations ? (
          /* ── Translations Review ── */
          <>
            <SheetHeader className="px-6 pt-6 pb-4">
              <SheetTitle className="flex items-center gap-2 text-xl font-bold">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-4 w-4 text-emerald-600" />
                </span>
                {t("categories.translations.title")}
              </SheetTitle>
              <SheetDescription>
                {t("categories.translations.description")}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="space-y-3">
                {allTranslationLangs.map((lang) => {
                  const meta = LANGUAGES[lang] ?? { label: lang, flag: "" };
                  const edited = editedTranslations[lang];
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
                            onChange={(e) => handleTranslationEdit(lang, "name", e.target.value)}
                            disabled={isUpdating}
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
                                handleTranslationEdit(lang, "description", e.target.value)
                              }
                              rows={2}
                              disabled={isUpdating}
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
            </div>

            <SheetFooter className="border-t border-slate-100 px-6 py-4">
              {updateErrorMessage && (
                <div
                  role="alert"
                  className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {updateErrorMessage}
                </div>
              )}
              <div className="flex w-full gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  {t("categories.translations.skip")}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleUpdateTranslations()}
                  disabled={isUpdating}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  {isUpdating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t("categories.translations.update")}
                </Button>
              </div>
            </SheetFooter>
          </>
        ) : (
          /* ── Category Form ── */
          <>
            <SheetHeader className="px-6 pt-6 pb-4">
              <SheetTitle className="text-xl font-bold">
                {t("categories.form.title")}
              </SheetTitle>
              <SheetDescription>
                {t("categories.form.description")}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="space-y-8">
                {errorMessage && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {errorMessage}
                  </div>
                )}

                {/* Live Preview */}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                    {t("categories.form.preview")}
                  </p>
                  <CategoryPreviewCard
                    name={name.trim()}
                    description={description.trim()}
                    color={color}
                    imagePreview={imagePreview}
                  />
                </div>

                <hr className="border-slate-200" />

                {/* Details */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {t("categories.form.detailsSection")}
                    </h3>
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="category-name"
                      className="text-sm font-medium text-slate-700"
                    >
                      {t("categories.form.nameLabel")}
                      <span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      id="category-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => setNameTouched(true)}
                      onKeyDown={handleNameKeyDown}
                      placeholder={t("categories.form.namePlaceholder")}
                      maxLength={NAME_MAX_LENGTH + 1}
                      disabled={isSubmitting}
                      className="h-11"
                      aria-invalid={!!nameError}
                      aria-describedby={nameError ? "name-error" : undefined}
                      autoFocus
                    />
                    {nameError ? (
                      <p id="name-error" className="text-xs text-red-500" role="alert">
                        {nameError}
                      </p>
                    ) : (
                      <div className="flex items-start gap-1.5 text-xs text-slate-500">
                        <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                        <span>{t("categories.form.nameHelper")}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="category-description"
                      className="text-sm font-medium text-slate-700"
                    >
                      {t("categories.form.descriptionLabel")}
                    </Label>
                    <Textarea
                      id="category-description"
                      value={description}
                      onChange={(e) =>
                        setDescription(e.target.value.slice(0, DESC_MAX_LENGTH))
                      }
                      placeholder={t("categories.form.descriptionPlaceholder")}
                      rows={3}
                      disabled={isSubmitting}
                      className="resize-none"
                    />
                    <div className="flex items-start gap-1.5 text-xs text-slate-500">
                      <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                      <span>{t("categories.form.descriptionHelper")}</span>
                    </div>
                    <p className="text-xs text-slate-400 text-right tabular-nums">
                      {description.length}/{DESC_MAX_LENGTH}
                    </p>
                  </div>

                  {/* Display Order */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      {t("categories.form.displayOrderLabel")}
                    </Label>
                    <DisplayOrderStepper
                      value={displayOrder}
                      onChange={setDisplayOrder}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <hr className="border-slate-200" />

                {/* Appearance */}
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {t("categories.form.appearanceSection")}
                  </h3>

                  {/* Image */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      {t("categories.form.imageLabel")}
                    </Label>
                    <ImageUploadField
                      value={imageFile}
                      onChange={setImageFile}
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Color */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      {t("categories.form.colorLabel")}
                    </Label>
                    <ColorPickerField
                      value={color}
                      onChange={setColor}
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-slate-500">
                      {t("categories.form.colorHelper")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <SheetFooter className="border-t border-slate-100 px-6 py-4">
              <div className="flex w-full gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {t("categories.form.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!canSubmit}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {t("categories.form.createButton")}
                </Button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
