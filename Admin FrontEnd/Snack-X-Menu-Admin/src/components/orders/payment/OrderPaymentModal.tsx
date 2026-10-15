import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, CreditCard, Info, Loader2 } from "lucide-react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";

import { OrderPaymentItemsTable } from "@/components/orders/payment/OrderPaymentItemsTable";
import { OrderPaymentStatusBadge } from "@/components/orders/payment/OrderPaymentStatusBadge";
import { PaidPaymentInfo } from "@/components/orders/payment/PaidPaymentInfo";
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
import { CURRENT_ORDERS_KEY } from "@/hooks/useCurrentOrders";
import { useOrderPaymentDetails } from "@/hooks/useOrderPaymentDetails";
import type { UseOrderPaymentModalReturn } from "@/hooks/useOrderPaymentModal";
import { toast } from "sonner";
import { generateOrderReceiptPdf } from "@/lib/pdf";
import { amountDue, defaultPaymentMethodId, validateAmount, parseAmount } from "@/lib/orderPaymentUtils";
import { friendlyErrorMessage, readErrorStatus } from "@/lib/apiErrors";
import { formatPrice } from "@/lib/orderBoardUtils";
import { payOrder } from "@/services/orderService";

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
  const [isPaying, setIsPaying] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // One payment at a time: closing the dialog or unmounting aborts the request,
  // and the backend answers 499, which we ignore.
  const payAbortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
    payAbortRef.current?.abort();
  }, []);

  // Fresh selection on every open, so a discarded payment never leaks into the
  // next one.
  useEffect(() => {
    if (!isOpen) return;
    setMethodId(null);
    setAmountError(null);
    setIsCopied(false);
    setIsPaying(false);
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
  const amountValue = due > 0 ? String(due) : "0";
  const parsedAmount = parseAmount(amountValue);
  const isAmountValid =
    parsedAmount !== null &&
    parsedAmount > 0 &&
    parsedAmount <= due + 0.005;

  // Only paid orders need the invoice details; unpaid ones pay right here.
  const detailsQuery = useOrderPaymentDetails(info?.orderId ?? null, isPaid);

  const handleGenerateReceipt = useCallback(() => {
    if (!info) return;
    generateOrderReceiptPdf({
      orderNumber: info.orderNumber,
      orderId: info.orderId,
      tableNumber: info.tableNumber,
      currencyCode: info.currencyCode,
      language,
      total: info.total,
      paidAmount: info.paidAmount,
      due,
      isPaid,
      lines: info.items,
    });
  }, [due, info, isPaid, language]);

  // Closing while a payment is on the wire cancels it; the backend answers 499
  // and `handlePay` stays silent about it.
  useEffect(() => {
    if (!isOpen) payAbortRef.current?.abort();
  }, [isOpen]);

  const handlePay = useCallback(async () => {
    // Guarded here as well as on the button: a second click must never fire a
    // second request.
    if (isPaying || !info) return;
    if (methodId === null || parsedAmount === null || !isAmountValid) return;
    // The backend rejects anything that is not the order total, exactly.
    if (Math.abs(parsedAmount - info.total) > 0.005) return;

    const controller = new AbortController();
    payAbortRef.current?.abort();
    payAbortRef.current = controller;
    setIsPaying(true);
    try {
      await payOrder(
        {
          orderId: info.orderId,
          paymentId: methodId,
          amountToPay: parsedAmount,
          notes: null,
        },
        controller.signal
      );

      toast.success(t("orderPayment.payment.success"));
      // The board holds no partial payments, so the order leaves it entirely.
      void queryClient.invalidateQueries({ queryKey: CURRENT_ORDERS_KEY });
      close();
    } catch (error) {
      // Cancelled on purpose (dialog closed, unmounted): stay silent.
      if (axios.isCancel(error) || readErrorStatus(error) === 499) return;
      toast.error(friendlyErrorMessage(error, t("orderPayment.payment.error")));
    } finally {
      if (payAbortRef.current === controller) payAbortRef.current = null;
      setIsPaying(false);
    }
  }, [close, info, isAmountValid, isPaying, methodId, parsedAmount, queryClient, t]);

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

              {isPaid ? (
                <PaidPaymentInfo
                  details={detailsQuery.data}
                  isLoading={detailsQuery.isPending}
                  isError={detailsQuery.isError}
                  fallbackPaidAmount={info.paidAmount}
                  currency={info.currencyCode}
                  language={language}
                />
              ) : (
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
              )}

              <Button
                type="button"
                variant={isPaid ? "default" : "outline"}
                onClick={handleGenerateReceipt}
                className="w-full"
              >
                <CreditCard className="h-4 w-4" aria-hidden />
                {t(isPaid ? "orderPayment.payment.paid.generateTicket" : "orderPayment.generateReceipt")}
              </Button>
              <p className="flex items-start gap-2 rounded-md bg-transparent px-1 py-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {t(isPaid ? "orderPayment.payment.paid.receiptNote" : "orderPayment.payment.receiptNote")}
              </p>
            </div>
          </div>
        )}

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
          {!isPaid && (
            <Button
              type="button"
              onClick={handlePay}
              disabled={isPaying || !isAmountValid || methodId === null}
              className="min-w-24"
            >
              {isPaying ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <CreditCard className="h-4 w-4" aria-hidden />
              )}
              {t("orderPayment.payment.pay")}
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
