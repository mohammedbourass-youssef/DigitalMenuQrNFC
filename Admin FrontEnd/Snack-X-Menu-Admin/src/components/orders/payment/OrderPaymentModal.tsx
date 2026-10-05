import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, CreditCard, Info } from "lucide-react";

import { OrderPaymentItemsTable } from "@/components/orders/payment/OrderPaymentItemsTable";
import { OrderPaymentStatusBadge } from "@/components/orders/payment/OrderPaymentStatusBadge";
import {
  RegisterPaymentForm,
  type AmountError,
} from "@/components/orders/payment/RegisterPaymentForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UseOrderPaymentModalReturn } from "@/hooks/useOrderPaymentModal";
import { amountDue, defaultPaymentMethodId, validateAmount } from "@/lib/orderPaymentUtils";
import { formatPrice } from "@/lib/orderBoardUtils";

const COPIED_FEEDBACK_MS = 2000;

/**
 * The dialog is laid out landscape on purpose: the order details sit on the
 * left, the money and the payment form on the right. That keeps it short
 * enough to read top to bottom without an inner scrollbar.
 */
export function OrderPaymentModal({ controller }: { controller: UseOrderPaymentModalReturn }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const {
    isOpen,
    order,
    close,
    info,
    methods,
    isMethodsLoading,
    isMethodsError,
    refetchMethods,
  } = controller;

  const [isCopied, setIsCopied] = useState(false);
  const [methodId, setMethodId] = useState<number | null>(null);
  const [amountError, setAmountError] = useState<AmountError | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  // Fresh selection on every open, so a discarded payment never leaks into the
  // next one.
  useEffect(() => {
    if (!isOpen) return;
    setMethodId(null);
    setAmountError(null);
    setIsCopied(false);
  }, [isOpen, order?.orderId]);

  // Preselect the tenant's default method as soon as the real list arrives.
  useEffect(() => {
    setMethodId((current) => current ?? defaultPaymentMethodId(methods));
  }, [methods]);

  const handleCopy = useCallback(async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.orderId);
      setIsCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Clipboard can be blocked by permissions; the id stays selectable.
    }
  }, [info]);

  const due = info ? amountDue(info.total, info.paidAmount) : 0;
  const isPaid = info?.paymentStatus === "Paid";

  // No payment endpoint exists yet, so the amount is validated but never sent.
  const handleAmountChange = useCallback(
    (value: string) => setAmountError(validateAmount(value, due)),
    [due]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent
        closeLabel={t("orderPayment.close")}
        className="w-[calc(100%-1.5rem)] max-w-[1040px] flex-col gap-0 overflow-visible p-0"
      >
        <DialogHeader className="shrink-0 gap-1 border-b border-slate-200 px-5 py-3 text-start dark:border-slate-700">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base font-bold">{t("orderPayment.title")}</DialogTitle>
            {info && <OrderPaymentStatusBadge status={info.paymentStatus} size="md" />}
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            {t("orderPayment.description")}
          </DialogDescription>
        </DialogHeader>

        {info && (
          /* One row on desktop, two independent columns: details on the left,
             money and payment on the right. */
          <div className="grid gap-x-8 gap-y-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
            {/* ---------------- left: identity + items ---------------- */}
            <div className="flex min-w-0 flex-col gap-4">
              <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] uppercase tracking-wide text-slate-400">
                    {t("orderPayment.orderId")}
                  </dt>
                  <dd className="flex items-center gap-1.5">
                    <span className="truncate font-mono text-xs text-slate-700 dark:text-slate-200">
                      {info.orderId}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopy()}
                      aria-label={t("orderPayment.copyId")}
                      title={t("orderPayment.copyId")}
                      className="shrink-0 rounded p-0.5 text-slate-400 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:text-slate-200"
                    >
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                    <span className="sr-only" aria-live="polite">
                      {isCopied ? t("orderPayment.copied") : ""}
                    </span>
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] uppercase tracking-wide text-slate-400">
                    {t("orderPayment.orderNumber")}
                  </dt>
                  <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    #{info.orderNumber}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] uppercase tracking-wide text-slate-400">
                    {t("orderPayment.tableNumber")}
                  </dt>
                  <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {info.tableNumber}
                  </dd>
                </div>
              </dl>

              <section className="flex min-w-0 flex-col gap-2">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {t("orderPayment.items.title")}
                </h3>
                <OrderPaymentItemsTable
                  items={info.items}
                  language={language}
                  currency={info.currencyCode}
                />
              </section>
            </div>

            {/* ---------------- right: money + payment ---------------- */}
            <div className="flex flex-col gap-4 lg:border-s lg:border-slate-200 lg:ps-6 dark:lg:border-slate-700">
              <dl className="space-y-1">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    {t("orderPayment.totals.total")}
                  </dt>
                  <dd className="text-sm font-medium tabular-nums text-slate-800 dark:text-slate-100">
                    {formatPrice(info.total, language, info.currencyCode)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    {t("orderPayment.totals.paid")}
                  </dt>
                  <dd className="text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatPrice(info.paidAmount, language, info.currencyCode)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-slate-200 pt-1 dark:border-slate-700">
                  <dt className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {t("orderPayment.totals.due")}
                  </dt>
                  <dd className="text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatPrice(due, language, info.currencyCode)}
                  </dd>
                </div>
              </dl>

              <RegisterPaymentForm
                methodId={methodId}
                onMethodChange={setMethodId}
                amount={due > 0 ? String(due) : "0"}
                onAmountChange={handleAmountChange}
                amountDue={due}
                amountError={amountError}
                methods={methods}
                isMethodsLoading={isMethodsLoading}
                isMethodsError={isMethodsError}
                onRetryMethods={refetchMethods}
                language={language}
                currency={info.currencyCode}
              />

              <p className="flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {t("orderPayment.payment.pendingEndpoint")}
              </p>
            </div>
          </div>
        )}

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
          {isPaid ? (
            <Button type="button" variant="outline" disabled>
              <CreditCard className="h-4 w-4" aria-hidden />
              {t("orderPayment.generateInvoice")}
            </Button>
          ) : (
            <Button type="button" disabled>
              {t("orderPayment.payment.confirm")}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={close}>
            {isPaid ? t("orderPayment.close") : t("orderPayment.discard")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}