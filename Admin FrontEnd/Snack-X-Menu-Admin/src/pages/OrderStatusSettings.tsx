import { useState } from "react";
import {
  AlertCircle,
  ClipboardList,
  Languages,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { friendlyErrorMessage, readApiError, readErrorStatus } from "@/lib/apiErrors";
import { StatusFormSheet, type StatusFormValues } from "@/components/orders/StatusFormSheet";
import {
  StatusTranslationsSheet,
  type StatusTranslationsPayload,
} from "@/components/orders/StatusTranslationsSheet";
import {
  useCreateOrderStatus,
  useDeleteOrderStatus,
  useOrderStatuses,
  useUpdateOrderStatus,
  useUpdateOrderStatusTranslations,
} from "@/hooks/useOrderStatuses";
import { useAuth } from "@/contexts/AuthContext";
import type { OrderStatusItem } from "@/types";

export default function OrderStatusSettingsPage() {
  const { i18n, t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const lang = i18n.language.toLowerCase();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<OrderStatusItem | null>(null);
  const [statusToDelete, setStatusToDelete] = useState<OrderStatusItem | null>(null);
  const [translating, setTranslating] = useState<OrderStatusItem | null>(null);

  const isOwner = user?.role === "TenantOwner";
  const query = useOrderStatuses(lang);
  const createMut = useCreateOrderStatus();
  const updateMut = useUpdateOrderStatus();
  const deleteMut = useDeleteOrderStatus();
  const updateTranslationsMut = useUpdateOrderStatusTranslations();

  const errorMessage = query.error
    ? friendlyErrorMessage(query.error, t("orders.statuses.loadError"))
    : null;

  const nextDisplayOrder =
    (query.data?.reduce((max, status) => Math.max(max, status.displayOrder), 0) ?? 0) + 1;

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (status: OrderStatusItem) => {
    setEditing(status);
    setSheetOpen(true);
  };

  const openTranslations = (status: OrderStatusItem) => {
    setTranslating(status);
  };

  const handleTranslationsSubmit = async (values: StatusTranslationsPayload) => {
    if (!translating) return;
    try {
      await updateTranslationsMut.mutateAsync({
        id: translating.id,
        translations: values.translations,
      });
      toast({ title: t("orders.translations.toast.saveSuccess") });
      setTranslating(null);
    } catch (err) {
      const status = readErrorStatus(err);
      if (status === 403 || status === 404) {
        toast({
          variant: "destructive",
          title: readApiError(err, t("orders.translations.toast.saveError")),
        });
        setTranslating(null);
        void query.refetch();
        return;
      }
      throw err;
    }
  };

  const handleSheetSubmit = async (values: StatusFormValues) => {
    if (editing) {
      try {
        await updateMut.mutateAsync({
          id: editing.id,
          payload: {
            name: values.name,
            color: values.color,
            displayOrder: values.displayOrder,
            isFinal: values.isFinal,
          },
        });
        toast({ title: t("orders.toast.updateSuccess") });
        setEditing(null);
        setSheetOpen(false);
      } catch (err) {
        const status = readErrorStatus(err);
        if (status === 403 || status === 404) {
          toast({
            variant: "destructive",
            title: readApiError(err, t("orders.toast.updateError")),
          });
          setEditing(null);
          setSheetOpen(false);
          void query.refetch();
          return;
        }
        throw err;
      }
    } else {
      await createMut.mutateAsync({
        code: values.name,
        color: values.color,
        displayOrder: values.displayOrder,
      });
      toast({ title: t("orders.toast.createSuccess") });
      setSheetOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!statusToDelete || deleteMut.isPending) return;
    try {
      await deleteMut.mutateAsync(statusToDelete.id);
      toast({ title: t("orders.toast.deleteSuccess") });
      setStatusToDelete(null);
    } catch (err) {
      toast({
        variant: "destructive",
        title: readApiError(err, t("orders.toast.deleteError")),
      });
      if (readErrorStatus(err) === 404) void query.refetch();
      setStatusToDelete(null);
    }
  };

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {t("orders.statusSettingsTitle")}
          </h1>
          {query.data && (
            <Badge variant="secondary">
              {t("orders.statuses.total", { count: query.data.length })}
            </Badge>
          )}
        </div>
        {isOwner && (
          <Button onClick={openCreate}>
            <Plus />
            {t("orders.statuses.add")}
          </Button>
        )}
      </div>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="relative">
          {(query.isFetching ||
            createMut.isPending ||
            updateMut.isPending ||
            deleteMut.isPending ||
            updateTranslationsMut.isPending) && (
            <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/50 pt-8 backdrop-blur-[1px]">
              <Spinner className="h-6 w-6 text-primary" />
            </div>
          )}

          {query.isPending ? (
            <StatusTableSkeleton />
          ) : query.isError ? (
            <div className="flex flex-col items-center gap-4 p-10 text-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="font-semibold text-red-800">{errorMessage}</p>
              <Button variant="outline" onClick={() => void query.refetch()}>
                <RefreshCw />
                {t("orders.statuses.retry")}
              </Button>
            </div>
          ) : query.data.length === 0 ? (
            <Empty className="min-h-[360px] border border-dashed border-slate-300 bg-white">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardList />
                </EmptyMedia>
                <EmptyTitle>{t("orders.statuses.emptyTitle")}</EmptyTitle>
                <EmptyDescription>{t("orders.statuses.emptySub")}</EmptyDescription>
              </EmptyHeader>
              {isOwner && (
                <EmptyContent>
                  <Button onClick={openCreate}>
                    <Plus />
                    {t("orders.statuses.add")}
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <StatusTable
              statuses={query.data}
              isOwner={isOwner}
              onEdit={openEdit}
              onDelete={(status) => setStatusToDelete(status)}
              onTranslations={openTranslations}
            />
          )}
        </div>
      </Card>

      {isOwner && (
        <StatusFormSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          editing={editing}
          nextDisplayOrder={nextDisplayOrder}
          onSubmit={handleSheetSubmit}
        />
      )}

      {isOwner && (
        <StatusTranslationsSheet
          open={translating !== null}
          onOpenChange={(open) => {
            if (!open && !updateTranslationsMut.isPending) setTranslating(null);
          }}
          status={translating}
          onSubmit={handleTranslationsSubmit}
        />
      )}

      <AlertDialog
        open={statusToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMut.isPending) setStatusToDelete(null);
        }}
      >
        <AlertDialogContent dir={dir} className="max-w-md text-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("orders.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {t("orders.delete.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={deleteMut.isPending}
              onClick={() => setStatusToDelete(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => void handleDelete()}>
              {deleteMut.isPending && <Spinner className="me-2 h-4 w-4" />}
              {t("orders.delete.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusTable({
  statuses,
  isOwner,
  onEdit,
  onDelete,
  onTranslations,
}: {
  statuses: OrderStatusItem[];
  isOwner: boolean;
  onEdit: (status: OrderStatusItem) => void;
  onDelete: (status: OrderStatusItem) => void;
  onTranslations: (status: OrderStatusItem) => void;
}) {
  const { t } = useTranslation();

  return (
    <TooltipProvider>
      <Table className="min-w-[640px] [&_th]:text-start">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{t("orders.statuses.columnName")}</TableHead>
            <TableHead>{t("orders.statuses.columnCode")}</TableHead>
            <TableHead>{t("orders.statuses.columnDisplayOrder")}</TableHead>
            <TableHead>{t("orders.statuses.columnStatus")}</TableHead>
            <TableHead className="text-end">{t("orders.statuses.columnActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {statuses.map((status) => (
            <TableRow key={status.id} className="hover:bg-slate-50/70">
              <TableCell>
                <div className="flex items-center gap-3">
                  <span
                    role="img"
                    aria-label={status.name}
                    className="h-5 w-5 shrink-0 rounded-full border border-slate-200"
                    style={{ backgroundColor: status.color ?? "#e2e8f0" }}
                  />
                  <span className="font-medium text-slate-900">{status.name}</span>
                  {status.isSystem && (
                    <Badge variant="secondary">{t("orders.statuses.system")}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm text-slate-500">{status.code}</span>
              </TableCell>
              <TableCell>
                <span className="tabular-nums text-slate-600">{status.displayOrder}</span>
              </TableCell>
              <TableCell>
                {status.isFinal ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-700"
                  >
                    {t("orders.statuses.final")}
                  </Badge>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </TableCell>
              <TableCell className="text-end">
                {isOwner && !status.isSystem ? (
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onTranslations(status)}
                      aria-label={t("orders.translations.open", { name: status.name })}
                      title={t("orders.translations.button")}
                    >
                      <Languages className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(status)}
                      aria-label={t("orders.statuses.editStatus", { name: status.name })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-600"
                      onClick={() => onDelete(status)}
                      aria-label={t("orders.statuses.deleteStatus", { name: status.name })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : status.isSystem ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400"
                        aria-label={t("orders.statuses.systemTooltip")}
                      >
                        <Lock className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{t("orders.statuses.systemTooltip")}</TooltipContent>
                  </Tooltip>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}

function StatusTableSkeleton() {
  const { t } = useTranslation();

  return (
    <Table className="min-w-[640px] [&_th]:text-start">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{t("orders.statuses.columnName")}</TableHead>
          <TableHead>{t("orders.statuses.columnCode")}</TableHead>
          <TableHead>{t("orders.statuses.columnDisplayOrder")}</TableHead>
          <TableHead>{t("orders.statuses.columnStatus")}</TableHead>
          <TableHead className="text-end">{t("orders.statuses.columnActions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }, (_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-32 max-w-full" />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-8" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16 rounded-full" />
            </TableCell>
            <TableCell className="text-end">
              <Skeleton className="ms-auto h-8 w-14" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}