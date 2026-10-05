import { memo } from "react";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PaymentMethodBadge } from "@/components/payments/PaymentMethodBadge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/orderBoardUtils";
import type { PaymentMethodOption } from "@/types/orderPayment";

export type AmountError = "required" | "tooHigh";

interface RegisterPaymentFormProps {
  /** Tenant id of the selected method, i.e. `TenantPaymentMethod.id`. */
  methodId: number | null;
  onMethodChange: (methodId: number) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  amountDue: number;
  amountError: AmountError | null;
  methods: PaymentMethodOption[];
  isMethodsLoading: boolean;
  isMethodsError: boolean;
  onRetryMethods: () => void;
  language: string;
  currency: string;
}

/**
 * Payment method (real, from `/PaymentMethods/Enabled`) and how much is left to
 * pay (real, from the order total). The date and notes inputs are gone: there
 * is no endpoint to receive them, and an input nobody can submit is worse than
 * no input at all.
 *
 * The dropdown stays fully interactive: the list is real data, so hiding it
 * behind a disabled control would be showing the user less than the API gave us.
 */
export const RegisterPaymentForm = memo(function RegisterPaymentForm({
  methodId,
  onMethodChange,
  amount,
  onAmountChange,
  amountDue,
  amountError,
  methods,
  isMethodsLoading,
  isMethodsError,
  onRetryMethods,
  language,
  currency,
}: RegisterPaymentFormProps) {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="order-payment-register-heading"
      className="flex flex-col gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-700"
    >
      <h3
        id="order-payment-register-heading"
        className="text-sm font-semibold text-slate-800 dark:text-slate-100"
      >
        {t("orderPayment.payment.section")}
      </h3>

      {/* Payment method */}
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="order-payment-method"
          className="text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          {t("orderPayment.payment.method")}
        </Label>

        {isMethodsLoading ? (
          <div aria-busy aria-label={t("orderPayment.payment.methodsLoading")}>
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ) : isMethodsError ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            <span>{t("orderPayment.payment.methodsError")}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetryMethods}
              className="h-7 px-2 text-xs"
            >
              {t("orderPayment.payment.retry")}
            </Button>
          </div>
        ) : methods.length === 0 ? (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            {t("orderPayment.payment.methodsEmpty")}{" "}
            <Link to="/payments/methods" className="font-semibold underline underline-offset-2">
              {t("orderPayment.payment.methodsEmptyLink")}
            </Link>
          </div>
        ) : (
          <Select
            value={methodId === null ? "" : String(methodId)}
            onValueChange={(value) => onMethodChange(Number(value))}
          >
            <SelectTrigger id="order-payment-method" className="h-9 w-full" aria-label={t("orderPayment.payment.method")}>
              <SelectValue placeholder={t("orderPayment.payment.methodPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {methods.map((method) => (
                <SelectItem key={method.id} value={String(method.id)} className="py-2">
                  <span className="flex items-center gap-2">
                    <PaymentMethodBadge
                      icon={method.icon}
                      color={method.color}
                      label={method.label}
                      size="sm"
                    />
                    <span>{method.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Amount still due */}
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="order-payment-amount"
          className="text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          {t("orderPayment.payment.amount")}
        </Label>
        <Input
          id="order-payment-amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          dir="ltr"
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          aria-invalid={amountError !== null}
          aria-describedby={amountError ? "order-payment-amount-error" : undefined}
          className="h-9 text-start tabular-nums"
        />
        {amountError ? (
          <p id="order-payment-amount-error" role="alert" className="text-[11px] text-red-600 dark:text-red-400">
            {amountError === "required"
              ? t("orderPayment.payment.amountRequired")
              : t("orderPayment.payment.amountTooHigh", {
                  due: formatPrice(amountDue, language, currency),
                })}
          </p>
        ) : (
          <p className="text-[11px] text-slate-400">
            {t("orderPayment.payment.amountDueHint")}
          </p>
        )}
      </div>
    </section>
  );
});