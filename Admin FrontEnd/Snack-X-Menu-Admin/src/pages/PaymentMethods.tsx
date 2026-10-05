import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AlertCircle, CreditCard, Lock, Plus, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  PaymentMethodDialog,
  type PaymentMethodFormValues,
} from "@/components/payments/PaymentMethodDialog";
import { PaymentMethodsTable } from "@/components/payments/PaymentMethodsTable";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAddPaymentMethod,
  useDeletePaymentMethod,
  usePaymentMethods,
  useReorderPaymentMethods,
  useSetPaymentMethodDefault,
  useSetPaymentMethodEnabled,
  useSystemPaymentMethods,
  useUpdatePaymentMethod,
} from "@/hooks/usePaymentMethods";
import { friendlyErrorMessage, readApiError } from "@/lib/apiErrors";
import { idsInOrder, moveByOffset, renumber, sortByDisplayOrder } from "@/lib/paymentMethodOrder";
import { paymentMethodErrorKey } from "@/services/paymentMethodService";
import type { SystemPaymentMethod, TenantPaymentMethod } from "@/types/paymentMethod";

export default function PaymentMethodsPage() {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();
  const dir = i18n.language?.startsWith("ar") ? "rtl" : "ltr";

  // The read endpoint is TenantOwner-only too, so a non-owner never queries it.
  const isOwner = user?.role === "TenantOwner";

  const query = usePaymentMethods(isOwner);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TenantPaymentMethod | null>(null);
  const [deleting, setDeleting] = useState<TenantPaymentMethod | null>(null);
  const [busyIds, setBusyIds] = useState<ReadonlySet<number>>(new Set());
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);
  const [quickSetupRunning, setQuickSetupRunning] = useState(false);

  const addMut = useAddPaymentMethod();
  const updateMut = useUpdatePaymentMethod();
  const deleteMut = useDeletePaymentMethod();
  const enabledMut = useSetPaymentMethodEnabled();
  const defaultMut = useSetPaymentMethodDefault();
  const reorderMut = useReorderPaymentMethods();

  // TenantOwner-only endpoint, so it is only fetched while the dialog is open
  // or the empty state needs it for quick setup.
  const systemQuery = useSystemPaymentMethods(
    isOwner && (dialogOpen || (query.data !== undefined && query.data.length === 0))
  );

  const methods = sortByDisplayOrder(query.data ?? []);
  const enabledCount = methods.filter((method) => method.isEnabled).length;
  const currentDefault = methods.find((method) => method.isDefault) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Long press, so a page scroll is never hijacked into a drag.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const markBusy = (id: number, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toastError = (error: unknown, fallbackKey: string) => {
    const key = paymentMethodErrorKey(error);
    toast.error(key ? t(key) : readApiError(error, t(fallbackKey)));
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (method: TenantPaymentMethod) => {
    setEditing(method);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (values: PaymentMethodFormValues) => {
    if (editing) {
      await updateMut.mutateAsync({
        id: editing.id,
        // An empty string means "no custom label"; the backend nulls it out.
        payload: { displayName: values.displayName, isEnabled: values.isEnabled },
      });
      toast.success(t("paymentsMethods.toast.updated"));
      return;
    }

    await addMut.mutateAsync({
      paymentMethodId: values.paymentMethodId,
      displayName: values.displayName,
      isEnabled: values.isEnabled,
      isDefault: values.isDefault,
    });
    toast.success(t("paymentsMethods.toast.added"));
  };

  const handleToggleEnabled = async (method: TenantPaymentMethod, next: boolean) => {
    if (enabledMut.isPending) return;
    markBusy(method.id, true);
    try {
      await enabledMut.mutateAsync({ id: method.id, payload: { isEnabled: next } });
      toast.success(t(next ? "paymentsMethods.toast.enabled" : "paymentsMethods.toast.disabled"));
    } catch (error) {
      toastError(error, "paymentsMethods.toast.saveError");
      void query.refetch();
    } finally {
      markBusy(method.id, false);
    }
  };

  const handleSetDefault = async (method: TenantPaymentMethod) => {
    if (defaultMut.isPending) return;
    markBusy(method.id, true);
    try {
      await defaultMut.mutateAsync(method.id);
      toast.success(t("paymentsMethods.toast.defaultSet"));
    } catch (error) {
      toastError(error, "paymentsMethods.toast.saveError");
      void query.refetch();
    } finally {
      markBusy(method.id, false);
    }
  };

  const commitOrder = async (next: TenantPaymentMethod[]) => {
    setOrderSaving(true);
    setOrderSaved(false);
    try {
      await reorderMut.mutateAsync({ orderedIds: idsInOrder(next) });
      toast.success(t("paymentsMethods.toast.reordered"));
      setOrderSaved(true);
      window.setTimeout(() => setOrderSaved(false), 2000);
    } catch (error) {
      toastError(error, "paymentsMethods.toast.saveError");
      void query.refetch();
    } finally {
      setOrderSaving(false);
    }
  };

  const handleMove = (method: TenantPaymentMethod, offset: number) => {
    const from = methods.findIndex((item) => item.id === method.id);
    if (from < 0) return;
    const next = renumber(moveByOffset(methods, from, offset));
    if (next.length !== methods.length) return;
    void commitOrder(next);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = methods.findIndex((item) => item.id === active.id);
    const to = methods.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;
    void commitOrder(renumber(moveByOffset(methods, from, to - from)));
  };

  const handleQuickSetup = async () => {
    if (quickSetupRunning || addMut.isPending) return;
    const catalog = systemQuery.data ?? [];
    // Seeded codes are CASH and CARD; the catalog rows are language-translated.
    const targets = ["CASH", "CARD"]
      .map((code) => catalog.find((method) => method.code.toUpperCase() === code))
      .filter((method): method is SystemPaymentMethod => method !== undefined && !method.alreadyAdded);

    if (targets.length === 0) {
      toast.error(t("paymentsMethods.quickSetup.unavailable"));
      return;
    }

    setQuickSetupRunning(true);
    try {
      for (const [index, target] of targets.entries()) {
        await addMut.mutateAsync({
          paymentMethodId: target.id,
          displayName: "",
          isEnabled: true,
          // First one added becomes the default, same as the dialog would do.
          isDefault: index === 0,
        });
      }
      toast.success(t("paymentsMethods.quickSetup.done"));
    } catch (error) {
      toastError(error, "paymentsMethods.toast.saveError");
      // One may have landed before the failure, so resync instead of assuming.
      void query.refetch();
    } finally {
      setQuickSetupRunning(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting || deleteMut.isPending) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      toast.success(t("paymentsMethods.toast.deleted"));
    } catch (error) {
      toastError(error, "paymentsMethods.toast.deleteError");
      // A missing row means the cache is stale, so resync either way.
      void query.refetch();
    } finally {
      setDeleting(null);
    }
  };

  const anyPending =
    addMut.isPending ||
    updateMut.isPending ||
    deleteMut.isPending ||
    enabledMut.isPending ||
    defaultMut.isPending ||
    reorderMut.isPending;

  const dialogBusy = addMut.isPending || updateMut.isPending;

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {t("paymentsMethods.title")}
          </h1>
          <p className="text-sm text-slate-500">{t("paymentsMethods.subtitle")}</p>
        </div>
        {isOwner && methods.length > 0 && (
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus />
            {t("paymentsMethods.add")}
          </Button>
        )}
      </div>

      {methods.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">
            {t("paymentsMethods.summary.enabledOverTotal", {
              enabled: enabledCount,
              total: methods.length,
            })}
          </Badge>
          {currentDefault && (
            <Badge className="border-amber-200 bg-amber-50 text-amber-700">
              {t("paymentsMethods.summary.defaultIs", { name: currentDefault.label })}
            </Badge>
          )}
          <span
            className="inline-flex items-center gap-1.5 text-xs text-slate-500"
            role="status"
            aria-live="polite"
          >
            {orderSaving && (
              <>
                <Spinner className="h-3 w-3" />
                {t("paymentsMethods.savingOrder")}
              </>
            )}
            {!orderSaving && orderSaved && t("paymentsMethods.orderSaved")}
          </span>
        </div>
      )}

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="relative">
          {anyPending && (
            <div className="absolute inset-0 z-20 flex items-start justify-center bg-white/40 pt-10 backdrop-blur-[1px]">
              <Spinner className="h-6 w-6 text-primary" />
            </div>
          )}

          {!isOwner ? (
            <Empty className="min-h-[320px] border border-dashed border-slate-300 bg-white">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Lock />
                </EmptyMedia>
                <EmptyTitle>{t("paymentsMethods.noAccess.title")}</EmptyTitle>
                <EmptyDescription>{t("paymentsMethods.noAccess.sub")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : query.isPending ? (
            <PaymentMethodsSkeleton />
          ) : query.isError ? (
            <div className="flex flex-col items-center gap-4 p-10 text-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="font-semibold text-red-800">
                {friendlyErrorMessage(query.error, t("paymentsMethods.error.load"))}
              </p>
              <Button variant="outline" onClick={() => void query.refetch()}>
                <RefreshCw />
                {t("paymentsMethods.retry")}
              </Button>
            </div>
          ) : methods.length === 0 ? (
            <Empty className="min-h-[340px] border border-dashed border-slate-300 bg-white">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CreditCard />
                </EmptyMedia>
                <EmptyTitle>{t("paymentsMethods.empty.title")}</EmptyTitle>
                <EmptyDescription>{t("paymentsMethods.empty.sub")}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  onClick={() => void handleQuickSetup()}
                  disabled={quickSetupRunning || systemQuery.isPending}
                  className="w-full bg-orange-500 hover:bg-orange-600 sm:w-auto"
                >
                  {quickSetupRunning ? (
                    <Spinner className="me-2 h-4 w-4" />
                  ) : (
                    <CreditCard />
                  )}
                  {t("paymentsMethods.quickSetup.label")}
                </Button>
                <Button variant="outline" onClick={openCreate} className="w-full sm:w-auto">
                  <Plus />
                  {t("paymentsMethods.empty.cta")}
                </Button>
                <p className="w-full text-center text-xs text-slate-500">
                  {t("paymentsMethods.quickSetup.hint")}
                </p>
              </EmptyContent>
            </Empty>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={methods.map((method) => method.id)}
                strategy={verticalListSortingStrategy}
              >
                <PaymentMethodsTable
                  methods={methods}
                  busyIds={busyIds}
                  onEdit={openEdit}
                  onDelete={setDeleting}
                  onToggleEnabled={handleToggleEnabled}
                  onSetDefault={handleSetDefault}
                  onMoveUp={(method) => handleMove(method, -1)}
                  onMoveDown={(method) => handleMove(method, 1)}
                />
              </SortableContext>
            </DndContext>
          )}
        </div>
      </Card>

      <PaymentMethodDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && !dialogBusy) {
            setDialogOpen(false);
            setEditing(null);
          }
        }}
        editing={editing}
        systemMethods={systemQuery.data ?? []}
        systemLoading={systemQuery.isPending || systemQuery.isFetching}
        isFirstMethod={methods.length === 0}
        onSubmit={handleDialogSubmit}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMut.isPending) setDeleting(null);
        }}
      >
        <AlertDialogContent dir={dir} className="max-w-md text-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("paymentsMethods.delete.title", { label: deleting?.label ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 leading-relaxed">
              <span className="block">{t("paymentsMethods.delete.description")}</span>
              {deleting?.isDefault && (
                <span className="block font-medium text-slate-700">
                  {t("paymentsMethods.delete.defaultNote")}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={deleteMut.isPending}
              onClick={() => setDeleting(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => void handleDelete()}
            >
              {deleteMut.isPending && <Spinner className="me-2 h-4 w-4" />}
              {t("paymentsMethods.delete.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PaymentMethodsSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
        </div>
      ))}
      <span className="sr-only">{t("paymentsMethods.loading")}</span>
    </div>
  );
}