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
import { ColorPickerField } from "@/components/categories/ColorPickerField";
import { readApiError, readErrorStatus } from "@/lib/apiErrors";
import type { OrderStatusItem } from "@/types";

export interface StatusFormValues {
  name: string;
  color: string;
  displayOrder: number;
  isFinal: boolean;
}

interface StatusFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: OrderStatusItem | null;
  nextDisplayOrder: number;
  onSubmit: (values: StatusFormValues) => Promise<void>;
}

const NAME_MAX_LENGTH = 50;
const DEFAULT_COLOR = "#3B82F6";
const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function StatusFormSheet({
  open,
  onOpenChange,
  editing,
  nextDisplayOrder,
  onSubmit,
}: StatusFormSheetProps) {
  const { t } = useTranslation();
  const isEditing = editing !== null;

  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [displayOrder, setDisplayOrder] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [displayOrderTouched, setDisplayOrderTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nameFieldError, setNameFieldError] = useState<string | null>(null);

  const [initialName, setInitialName] = useState("");
  const [initialColor, setInitialColor] = useState(DEFAULT_COLOR);
  const [initialDisplayOrder, setInitialDisplayOrder] = useState(1);
  const [initialIsFinal, setInitialIsFinal] = useState(false);

  useEffect(() => {
    if (open) {
      const nextName = editing?.code ?? "";
      const nextColor = editing?.color ?? DEFAULT_COLOR;
      const nextOrder = editing ? editing.displayOrder : nextDisplayOrder;
      const nextIsFinal = editing?.isFinal ?? false;
      setName(nextName);
      setColor(nextColor);
      setDisplayOrder(String(nextOrder));
      setIsFinal(nextIsFinal);
      setInitialName(nextName);
      setInitialColor(nextColor);
      setInitialDisplayOrder(nextOrder);
      setInitialIsFinal(nextIsFinal);
      setNameTouched(false);
      setDisplayOrderTouched(false);
      setIsSubmitting(false);
      setErrorMessage(null);
      setNameFieldError(null);
    }
  }, [open, editing, nextDisplayOrder]);

  const handleSheetOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isSubmitting) return;
      onOpenChange(nextOpen);
    },
    [isSubmitting, onOpenChange]
  );

  const parsedDisplayOrder = displayOrder.trim() === "" ? null : Number(displayOrder);
  const nameError =
    nameTouched && name.trim().length === 0
      ? t("orders.statusForm.nameRequired")
      : nameTouched && name.trim().length > NAME_MAX_LENGTH
        ? t("orders.statusForm.nameTooLong", { max: NAME_MAX_LENGTH })
        : null;

  const displayOrderError =
    displayOrderTouched && parsedDisplayOrder === null
      ? t("orders.statusForm.displayOrderRequired")
      : displayOrderTouched &&
          (parsedDisplayOrder === null ||
            !Number.isInteger(parsedDisplayOrder) ||
            parsedDisplayOrder < 1)
        ? t("orders.statusForm.displayOrderInvalid")
        : null;

  const colorError = !HEX_REGEX.test(color) ? t("orders.statusForm.colorInvalid") : null;

  const nameValid = name.trim().length > 0 && name.trim().length <= NAME_MAX_LENGTH;
  const displayOrderValid =
    displayOrder.trim() !== "" &&
    parsedDisplayOrder !== null &&
    Number.isInteger(parsedDisplayOrder) &&
    parsedDisplayOrder >= 1;
  const colorValid = HEX_REGEX.test(color);
  const canSubmit = nameValid && displayOrderValid && colorValid && !isSubmitting;

  const hasChanges =
    name.trim() !== initialName ||
    color !== initialColor ||
    (parsedDisplayOrder ?? initialDisplayOrder) !== initialDisplayOrder ||
    isFinal !== initialIsFinal;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting || parsedDisplayOrder === null) return;
    if (isEditing && !hasChanges) {
      onOpenChange(false);
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    setNameFieldError(null);
    try {
      await onSubmit({
        name: name.trim(),
        color,
        displayOrder: parsedDisplayOrder,
        isFinal,
      });
    } catch (err: unknown) {
      const message = readApiError(
        err,
        t(isEditing ? "orders.toast.updateError" : "orders.toast.createError")
      );
      if (readErrorStatus(err) === 400 && isEditing) {
        setNameFieldError(message);
      } else {
        setErrorMessage(message);
      }
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
                {t("orders.statusForm.editTitle")}
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-slate-400" />
                {t("orders.statusForm.title")}
              </>
            )}
          </SheetTitle>
          <SheetDescription>
            {t(isEditing ? "orders.statusForm.editDescription" : "orders.statusForm.description")}
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

            <div className="flex items-start gap-1.5 rounded-lg bg-orange-50 px-3 py-2.5 text-xs text-orange-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t("orders.statusForm.helper")}</span>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="status-name" className="text-sm font-medium text-slate-700">
                {t("orders.statusForm.nameLabel")}
                <span className="ms-1 text-red-500">*</span>
              </Label>
              <Input
                id="status-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setNameTouched(true)}
                onKeyDown={checkError}
                placeholder={t("orders.statusForm.namePlaceholder")}
                maxLength={NAME_MAX_LENGTH + 1}
                disabled={isSubmitting}
                className="h-11"
                aria-invalid={!!nameError || !!nameFieldError}
                aria-describedby={nameError || nameFieldError ? "name-error" : undefined}
                autoFocus
              />
              {nameError && (
                <p id="name-error" className="text-xs text-red-500" role="alert">
                  {nameError}
                </p>
              )}
              {nameFieldError && (
                <p id="name-error" className="text-xs text-red-500" role="alert">
                  {nameFieldError}
                </p>
              )}
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                {t("orders.statusForm.colorLabel")}
              </Label>
              <ColorPickerField value={color} onChange={setColor} disabled={isSubmitting} />
              {colorError ? (
                <p className="text-xs text-red-500" role="alert">
                  {colorError}
                </p>
              ) : (
                <p className="text-xs text-slate-500">{t("orders.statusForm.colorHelper")}</p>
              )}
            </div>

            {/* Display order */}
            <div className="space-y-2">
              <Label
                htmlFor="status-display-order"
                className="text-sm font-medium text-slate-700"
              >
                {t("orders.statusForm.displayOrderLabel")}
                <span className="ms-1 text-red-500">*</span>
              </Label>
              <Input
                id="status-display-order"
                type="number"
                min="1"
                step="1"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                onBlur={() => setDisplayOrderTouched(true)}
                onKeyDown={checkError}
                placeholder={t("orders.statusForm.displayOrderPlaceholder")}
                disabled={isSubmitting}
                className="h-11"
                aria-invalid={!!displayOrderError}
                aria-describedby={displayOrderError ? "display-order-error" : undefined}
              />
              {displayOrderError && (
                <p id="display-order-error" className="text-xs text-red-500" role="alert">
                  {displayOrderError}
                </p>
              )}
            </div>

            {/* Is final (edit mode only) */}
            {isEditing && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-slate-900">
                    {t("orders.statusForm.isFinalLabel")}
                  </Label>
                  <p className="text-xs text-slate-500">{t("orders.statusForm.isFinalHint")}</p>
                </div>
                <Switch
                  checked={isFinal}
                  onCheckedChange={setIsFinal}
                  disabled={isSubmitting}
                  aria-label={t("orders.statusForm.isFinalLabel")}
                />
              </div>
            )}
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
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : isEditing ? (
                <Pencil className="me-2 h-4 w-4" />
              ) : (
                <Plus className="me-2 h-4 w-4" />
              )}
              {t(isEditing ? "orders.statusForm.updateButton" : "orders.statusForm.createButton")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}