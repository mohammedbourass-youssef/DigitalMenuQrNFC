import { memo } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { PaymentMethodBadge } from "@/components/payments/PaymentMethodBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatPrice } from "@/lib/orderBoardUtils";
import type { OrderPaymentDetails } from "@/types/orderPayment";

const EM_DASH = "—";

interface PaidPaymentInfoProps {
  /** Null until the details request resolves (or when the endpoint is missing). */
  details: OrderPaymentDetails | undefined;
  isLoading: boolean;
  isError: boolean;
  /** Board-known amount, shown while/if the details request has no answer. */
  fallbackPaidAmount: number;
  currency: string;
  language: string;
}

/**
 * Read-only counterpart of `RegisterPaymentForm`, rendered once an order is
 * paid: it answers "where / when / how" and offers no input, because the money
 * is already recorded on the server.
 */
export const PaidPaymentInfo = memo(function PaidPaymentInfo({
  details,
  isLoading,
  isError,
  fallbackPaidAmount,
  currency,
  language,
}: PaidPaymentInfoProps) {
  const { t } = useTranslation();

  const paidAmount = details?.paidAmount ?? fallbackPaidAmount;
  const method = details?.paymentMethod ?? null;
  const paidAt = details?.paidAtUtc ? formatDateTime(details.paidAtUtc, language) : "";
  const cashier = details?.cashier?.fullName?.trim() ?? "";
  const notes = details?.notes?.trim() ?? "";

  const row = (label: string, value: ReactNode) => (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="min-w-0 text-end text-sm font-medium text-slate-800 dark:text-slate-100">
        {value}
      </dd>
    </div>
  );

  return (
    <section
      aria-labelledby="order-payment-paid-heading"
      className="flex flex-col gap-3 rounded-md border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20"
    >
      <h3
        id="order-payment-paid-heading"
        className="text-sm font-semibold text-emerald-800 dark:text-emerald-200"
      >
        {t("orderPayment.payment.paid.section")}
      </h3>

      {isLoading ? (
        <div aria-busy aria-label={t("orderPayment.payment.paid.loading")} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-3/5 rounded" />
          <Skeleton className="h-4 w-2/5 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
        </div>
      ) : (
        <dl className="flex flex-col gap-2">
          {row(
            t("orderPayment.payment.method"),
            method ? (
              <span className="flex items-center justify-end gap-2">
                <PaymentMethodBadge
                  icon={method.icon}
                  color={method.color}
                  label={method.label}
                  size="sm"
                />
                <span>{method.label}</span>
              </span>
            ) : (
              <span className="text-slate-400">{EM_DASH}</span>
            )
          )}
          {row(
            t("orderPayment.payment.paid.date"),
            paidAt ? <span className="tabular-nums">{paidAt}</span> : <span className="text-slate-400">{EM_DASH}</span>
          )}
          {row(
            t("orderPayment.payment.paid.amount"),
            <span className="tabular-nums">{formatPrice(paidAmount, language, currency)}</span>
          )}
          {cashier && row(t("orderPayment.payment.paid.cashier"), <span>{cashier}</span>)}
          {notes && row(t("orderPayment.payment.paid.notes"), <span className="font-normal">{notes}</span>)}
        </dl>
      )}

      {isError && !isLoading && (
        <p className="text-[11px] text-slate-400">{t("orderPayment.payment.paid.unavailable")}</p>
      )}
    </section>
  );
});
