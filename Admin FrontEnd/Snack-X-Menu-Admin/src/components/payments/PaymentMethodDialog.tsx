import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Loader2, Pencil, Plus, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  PaymentMethodBadge,
  PAYMENT_METHOD_FALLBACK_COLOR,
} from "@/components/payments/PaymentMethodBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { readApiError } from "@/lib/apiErrors";
import { paymentMethodErrorKey } from "@/services/paymentMethodService";
import type { SystemPaymentMethod, TenantPaymentMethod } from "@/types/paymentMethod";

export const LABEL_MAX_LENGTH = 100;

export interface PaymentMethodFormValues {
  paymentMethodId: number;
  displayName: string;
  isEnabled: boolean;
  isDefault: boolean;
}

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null = add mode. */
  editing: TenantPaymentMethod | null;
  /** Catalog for the dropdown; add mode only. */
  systemMethods: SystemPaymentMethod[];
  /** True while the catalog is loading (add mode only). */
  systemLoading: boolean;
  /** The tenant already has a method - forces "Set as default" on. */
  isFirstMethod: boolean;
  onSubmit: (values: PaymentMethodFormValues) => Promise<void>;
}

export function PaymentMethodDialog({
  open,
  onOpenChange,
  editing,
  systemMethods,
  systemLoading,
  isFirstMethod,
  onSubmit,
}: PaymentMethodDialogProps) {
  const { t } = useTranslation();
  const isEditing = editing !== null;

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset on every open so a previous (possibly failed) attempt never leaks in.
  useEffect(() => {
    if (!open) return;
    setSelectedId(editing?.paymentMethodId ?? null);
    setDisplayName(editing?.displayName ?? "");
    setIsEnabled(editing?.isEnabled ?? true);
    // The first method added to a tenant is always the default.
    setIsDefault(editing ? editing.isDefault : isFirstMethod);
    setTouched(false);
    setIsSubmitting(false);
    setErrorMessage(null);
  }, [open, editing, isFirstMethod]);

  const available = useMemo(
    () => systemMethods.filter((method) => !method.alreadyAdded || method.id === selectedId),
    [systemMethods, selectedId]
  );
  const allAdded = !isEditing && !systemLoading && available.length === 0;

  const selected = useMemo(
    () => systemMethods.find((method) => method.id === selectedId) ?? null,
    [systemMethods, selectedId]
  );

  // In edit mode the catalog row may be missing (e.g. a deactivated system
  // method), so the tenant row we were given is the only fallback. `label`
  // already contains the custom label, so `systemName` is the true default.
  const defaultName = isEditing ? (editing?.systemName ?? "") : (selected?.name ?? "");
  const effectiveColor = isEditing
    ? (editing?.color ?? PAYMENT_METHOD_FALLBACK_COLOR)
    : (selected?.color ?? PAYMENT_METHOD_FALLBACK_COLOR);
  const effectiveIcon = isEditing ? (editing?.icon ?? null) : (selected?.icon ?? null);
  const placeholder =
    defaultName || t("paymentsMethods.form.customLabelPlaceholder");

  const defaultOnLocked = !isEditing && isFirstMethod;
  const labelTooLong = displayName.length > LABEL_MAX_LENGTH;
  const canSubmit = selectedId !== null && !labelTooLong && !isSubmitting;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isSubmitting) return;
      onOpenChange(nextOpen);
    },
    [isSubmitting, onOpenChange]
  );

  const handleSubmit = async () => {
    setTouched(true);
    if (!canSubmit || selectedId === null) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit({
        paymentMethodId: selectedId,
        displayName: displayName.trim(),
        isEnabled,
        isDefault,
      });
      onOpenChange(false);
    } catch (error: unknown) {
      // Prefer the mapped code (DUPLICATE, ...) over the raw backend message.
      const key = paymentMethodErrorKey(error);
      setErrorMessage(
        key ? t(key) : readApiError(error, t("paymentsMethods.form.genericError"))
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && canSubmit) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  const clearCustomLabel = () => {
    setDisplayName("");
    setTouched(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-lg">
        <SheetHeader className="px-6 pb-4 pt-6">
          <SheetTitle className="flex items-center gap-2 text-xl font-bold">
            {isEditing ? (
              <>
                <Pencil className="h-5 w-5 text-slate-400" />
                {t("paymentsMethods.form.editTitle")}
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-slate-400" />
                {t("paymentsMethods.form.addTitle")}
              </>
            )}
          </SheetTitle>
          <SheetDescription>
            {t(isEditing ? "paymentsMethods.form.editDescription" : "paymentsMethods.form.addDescription")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-5" onKeyDown={handleKeyDown}>
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {errorMessage}
              </div>
            )}

            {/* System method: read-only when editing. */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                {t("paymentsMethods.form.methodLabel")}
                {!isEditing && <span className="ms-1 text-red-500">*</span>}
              </Label>

              {isEditing ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <PaymentMethodBadge
                    icon={editing?.icon}
                    color={editing?.color}
                    label={editing?.label ?? ""}
                  />
                  <span className="font-medium text-slate-900">{editing?.label}</span>
                </div>
              ) : allAdded ? (
                <div className="flex items-start gap-2 rounded-lg bg-orange-50 px-3 py-2.5 text-sm text-orange-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {t("paymentsMethods.form.allAdded")}
                </div>
              ) : systemLoading ? (
                <div className="flex h-11 items-center rounded-xl border border-slate-200 px-3 text-sm text-slate-400">
                  {t("paymentsMethods.form.loadingMethods")}
                </div>
              ) : (
                <>
                  <Select
                    value={selectedId === null ? undefined : String(selectedId)}
                    onValueChange={(value) => {
                      setSelectedId(Number(value));
                      setTouched(false);
                    }}
                  >
                    <SelectTrigger
                      className="h-11 w-full"
                      aria-label={t("paymentsMethods.form.methodLabel")}
                    >
                      <SelectValue
                        placeholder={t("paymentsMethods.form.methodPlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {available.map((method) => (
                        <SelectItem
                          key={method.id}
                          value={String(method.id)}
                          disabled={method.alreadyAdded}
                          className="gap-3 py-2.5"
                        >
                          <span className="flex items-center gap-2">
                            <PaymentMethodBadge
                              icon={method.icon}
                              color={method.color}
                              label={method.name}
                              size="sm"
                            />
                            <span className="flex flex-col">
                              <span className="font-medium">{method.name}</span>
                              {method.description && (
                                <span className="text-xs text-slate-500">
                                  {method.description}
                                </span>
                              )}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {touched && selectedId === null && (
                    <p className="text-xs text-red-500" role="alert">
                      {t("paymentsMethods.form.methodRequired")}
                    </p>
                  )}
                  {systemMethods.some((method) => method.alreadyAdded) && (
                    <p className="text-xs text-slate-500">
                      {t("paymentsMethods.form.alreadyAddedHint")}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Custom label */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="pm-display-name" className="text-sm font-medium text-slate-700">
                  {t("paymentsMethods.form.customLabelLabel")}
                </Label>
                <span
                  className={`text-xs tabular-nums ${
                    labelTooLong ? "text-red-500" : "text-slate-400"
                  }`}
                >
                  {displayName.length}/{LABEL_MAX_LENGTH}
                </span>
              </div>
              <Input
                id="pm-display-name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                onBlur={() => setTouched(true)}
                placeholder={placeholder}
                maxLength={LABEL_MAX_LENGTH}
                disabled={isSubmitting}
                className="h-11"
                aria-invalid={labelTooLong}
                autoFocus={!isEditing}
              />
              {labelTooLong ? (
                <p className="text-xs text-red-500" role="alert">
                  {t("paymentsMethods.form.customLabelTooLong", { max: LABEL_MAX_LENGTH })}
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  {t("paymentsMethods.form.customLabelHint")}
                </p>
              )}
              {isEditing && displayName.trim() !== "" && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={clearCustomLabel}
                  disabled={isSubmitting}
                >
                  <RotateCcw className="me-1 h-3 w-3" />
                  {t("paymentsMethods.form.resetLabel")}
                </Button>
              )}
            </div>

            {/* Enabled */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-slate-900">
                  {t("paymentsMethods.form.enabledLabel")}
                </Label>
                <p className="text-xs text-slate-500">
                  {t("paymentsMethods.form.enabledHint")}
                </p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
                disabled={isSubmitting}
                role="switch"
                aria-label={t("paymentsMethods.form.enabledLabel")}
              />
            </div>

            {/* Default - only in add mode; the star in the row owns it otherwise. */}
            {!isEditing && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-slate-900">
                    {t("paymentsMethods.form.defaultLabel")}
                  </Label>
                  <p className="text-xs text-slate-500">
                    {t(
                      defaultOnLocked
                        ? "paymentsMethods.form.defaultHintFirst"
                        : "paymentsMethods.form.defaultHint"
                    )}
                  </p>
                </div>
                <Switch
                  checked={isDefault || defaultOnLocked}
                  onCheckedChange={setIsDefault}
                  disabled={isSubmitting || defaultOnLocked}
                  role="switch"
                  aria-label={t("paymentsMethods.form.defaultLabel")}
                />
              </div>
            )}

            {/* Live preview */}
            {selectedId !== null && (
              <div className="space-y-2 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("paymentsMethods.form.previewLabel")}
                </p>
                <div className="flex items-center gap-3">
                  <PaymentMethodBadge
                    icon={effectiveIcon}
                    color={effectiveColor}
                    label={displayName.trim() || defaultName}
                  />
                  <span className="font-medium text-slate-900">
                    {displayName.trim() || defaultName}
                  </span>
                  {isDefault && (
                    <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                      <Check className="h-2.5 w-2.5" aria-hidden />
                      {t("paymentsMethods.defaultBadge")}
                    </span>
                  )}
                </div>
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
              {t(
                isEditing
                  ? "paymentsMethods.form.saveButton"
                  : "paymentsMethods.form.addButton"
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}