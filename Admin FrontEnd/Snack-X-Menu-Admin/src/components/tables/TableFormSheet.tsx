import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, Pencil, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { TableItem } from "@/types";

export interface TableFormValues {
  number: number;
  name: string;
  isAvailable: boolean;
}

interface TableFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: TableItem | null;
  onSubmit: (values: TableFormValues) => Promise<void>;
}

const NAME_MAX_LENGTH = 100;

export function TableFormSheet({ open, onOpenChange, editing, onSubmit }: TableFormSheetProps) {
  const { t } = useTranslation();

  const [numberField, setNumberField] = useState("");
  const [name, setName] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [numberTouched, setNumberTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditing = editing !== null;

  useEffect(() => {
    if (open) {
      setNumberField(editing != null ? String(editing.number) : "");
      setName(editing?.name ?? "");
      setIsAvailable(editing?.isAvailable ?? true);
      setNumberTouched(false);
      setNameTouched(false);
      setIsSubmitting(false);
      setErrorMessage(null);
    }
  }, [open, editing]);

  const handleSheetOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isSubmitting) return;
      onOpenChange(nextOpen);
    },
    [isSubmitting, onOpenChange]
  );

  const parsedNumber = numberField.trim() === "" ? null : Number(numberField);
  const numberError =
    numberTouched && numberField.trim() === ""
      ? t("tables.form.numberRequired")
      : numberTouched && (parsedNumber === null || !Number.isInteger(parsedNumber) || parsedNumber <= 0)
        ? t("tables.form.numberInvalid")
        : null;

  const nameError =
    nameTouched && name.trim().length === 0
      ? t("tables.form.nameRequired")
      : nameTouched && name.trim().length > NAME_MAX_LENGTH
        ? t("tables.form.nameTooLong")
        : null;

  const numberValid =
    numberField.trim() !== "" && parsedNumber !== null && Number.isInteger(parsedNumber) && parsedNumber > 0;
  const nameValid = name.trim().length > 0 && name.trim().length <= NAME_MAX_LENGTH;
  const canSubmit = numberValid && nameValid && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting || parsedNumber === null) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit({ number: parsedNumber, name: name.trim(), isAvailable });
    } catch (err: unknown) {
      let message = t(isEditing ? "tables.toast.updateError" : "tables.toast.createError");
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
      setIsSubmitting(false);
    }
  };

  const checkError = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSubmit) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-lg">
        <SheetHeader className="px-6 pb-4 pt-6">
          <SheetTitle className="flex items-center gap-2 text-xl font-bold">
            {isEditing ? (
              <>
                <Pencil className="h-5 w-5 text-slate-400" />
                {t("tables.form.editTitle")}
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-slate-400" />
                {t("tables.form.title")}
              </>
            )}
          </SheetTitle>
          <SheetDescription>
            {t(isEditing ? "tables.form.editDescription" : "tables.form.description")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-5">
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {errorMessage}
              </div>
            )}

            {/* Number */}
            <div className="space-y-2">
              <Label htmlFor="table-number" className="text-sm font-medium text-slate-700">
                {t("tables.form.numberLabel")}
                <span className="ml-1 text-red-500">*</span>
              </Label>
              <Input
                id="table-number"
                type="number"
                min="1"
                step="1"
                value={numberField}
                onChange={(e) => setNumberField(e.target.value)}
                onBlur={() => setNumberTouched(true)}
                onKeyDown={checkError}
                placeholder={t("tables.form.numberPlaceholder")}
                disabled={isSubmitting}
                className="h-11"
                aria-invalid={!!numberError}
                aria-describedby={numberError ? "number-error" : undefined}
                autoFocus
              />
              {numberError && (
                <p id="number-error" className="text-xs text-red-500" role="alert">
                  {numberError}
                </p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="table-name" className="text-sm font-medium text-slate-700">
                {t("tables.form.nameLabel")}
                <span className="ml-1 text-red-500">*</span>
              </Label>
              <Input
                id="table-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setNameTouched(true)}
                onKeyDown={checkError}
                placeholder={t("tables.form.namePlaceholder")}
                maxLength={NAME_MAX_LENGTH + 1}
                disabled={isSubmitting}
                className="h-11"
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "name-error" : undefined}
              />
              {nameError && (
                <p id="name-error" className="text-xs text-red-500" role="alert">
                  {nameError}
                </p>
              )}
            </div>

            {/* Availability */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-slate-900">
                  {t("tables.form.availableLabel")}
                </Label>
                <p className="text-xs text-slate-500">{t("tables.form.availableHint")}</p>
              </div>
              <Switch
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
                disabled={isSubmitting}
                aria-label={t("tables.form.availableLabel")}
              />
            </div>
          </div>
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
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isEditing ? (
                <Pencil className="mr-2 h-4 w-4" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {t(isEditing ? "tables.form.updateButton" : "tables.form.createButton")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}