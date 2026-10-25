import { useState } from "react";
import {
  AlertCircle,
  Grid2X2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  Plus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { friendlyErrorMessage } from "@/lib/apiErrors";
import { cn } from "@/lib/utils";
import { tablesQueryKey, useCreateTable, useDeleteTable, useTables, useUpdateTable } from "@/hooks/useTables";
import { TableFormSheet, type TableFormValues } from "@/components/tables/TableFormSheet";
import type { TableItem } from "@/types";
import { usePlanQuota } from "@/hooks/usePlanQuota";
import { QuotaUsage } from "@/components/plan/QuotaUsage";
import { handlePlanQuotaLimitError } from "@/lib/planQuotaErrors";

export default function TablesPage() {
  const { i18n, t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: quota } = usePlanQuota();
  const canAddTable = quota?.tables.canAdd !== false;
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TableItem | null>(null);
  const [tableToDelete, setTableToDelete] = useState<TableItem | null>(null);

  const query = useTables();
  const createMut = useCreateTable();
  const updateMut = useUpdateTable();
  const deleteMut = useDeleteTable();

  const errorMessage = query.error
    ? friendlyErrorMessage(query.error, t("tables.loadError"))
    : null;

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (table: TableItem) => {
    setEditing(table);
    setSheetOpen(true);
  };

  const handleSheetSubmit = async (values: TableFormValues) => {
    if (!editing && !canAddTable) return;

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...values });
        toast({ title: t("tables.toast.updateSuccess") });
      } else {
        await createMut.mutateAsync(values);
        toast({ title: t("tables.toast.createSuccess") });
      }
      setSheetOpen(false);
      setEditing(null);
    } catch (error) {
      if (handlePlanQuotaLimitError(error, "tables", quota, queryClient, t)) return;
      throw error;
    }
  };

  const handleToggle = (table: TableItem) => {
    if (updateMut.isPending) return;
    updateMut.mutate(
      { id: table.id, number: table.number, name: table.name, isAvailable: !table.isAvailable },
      {
        onSuccess: () => {
          queryClient.setQueryData<TableItem[]>(tablesQueryKey, (old) =>
            old?.map((row) =>
              row.id === table.id ? { ...row, isAvailable: !row.isAvailable } : row
            )
          );
          toast({ title: t("tables.toast.availabilitySuccess") });
        },
        onError: () => toast({ variant: "destructive", title: t("tables.toast.updateError") }),
      }
    );
  };

  const handleDelete = () => {
    if (!tableToDelete || deleteMut.isPending) return;
    deleteMut.mutate(tableToDelete.id, {
      onSuccess: () => {
        toast({ title: t("tables.toast.deleteSuccess") });
        setTableToDelete(null);
      },
      onError: () => toast({ variant: "destructive", title: t("tables.toast.deleteError") }),
    });
  };

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-slate-900">{t("tables.title")}</h1>
          {query.data && (
            <Badge variant="secondary">{t("tables.total", { count: query.data.length })}</Badge>
          )}
          <QuotaUsage
            resource="tables"
            label={t("tables.title")}
            showLimitMessage
            limitMessage={t("planQuota.tableLimitReached", {
              display: quota?.tables.display ?? "—",
              defaultValue: `Table limit reached (${quota?.tables.display ?? "—"}).`,
            })}
          />
        </div>
        <Button onClick={openCreate} disabled={!canAddTable}>
          <Plus />
          {t("tables.add")}
        </Button>
      </div>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="relative">
          {(query.isFetching || deleteMut.isPending) && (
            <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/50 pt-8 backdrop-blur-[1px]">
              <Spinner className="h-6 w-6 text-primary" />
            </div>
          )}

          {query.isPending ? (
            <TablesTableSkeleton />
          ) : query.isError ? (
            <div className="flex flex-col items-center gap-4 p-10 text-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="font-semibold text-red-800">{errorMessage}</p>
              <Button variant="outline" onClick={() => void query.refetch()}>
                <RefreshCw />
                {t("tables.retry")}
              </Button>
            </div>
          ) : query.data.length === 0 ? (
            <Empty className="min-h-[360px] border border-dashed border-slate-300 bg-white">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Grid2X2 />
                </EmptyMedia>
                <EmptyTitle>{t("tables.empty_title")}</EmptyTitle>
                <EmptyDescription>{t("tables.empty_sub")}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={openCreate} disabled={!canAddTable}>
                  <Plus />
                  {t("tables.add")}
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <TablesTable
              tables={query.data}
              onEdit={openEdit}
              onDelete={(row) => setTableToDelete(row)}
              onToggle={handleToggle}
            />
          )}
        </div>
      </Card>

      <TableFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        onSubmit={handleSheetSubmit}
      />

      <AlertDialog
        open={tableToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMut.isPending) setTableToDelete(null);
        }}
      >
        <AlertDialogContent dir={dir} className="max-w-md text-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("tables.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {tableToDelete
                ? t("tables.delete.description", {
                    number: tableToDelete.number,
                    name: tableToDelete.name || "—",
                  })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={deleteMut.isPending}
              onClick={() => setTableToDelete(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" disabled={deleteMut.isPending} onClick={handleDelete}>
              {deleteMut.isPending && <Spinner className="h-4 w-4" />}
              {t("tables.delete.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TablesTable({
  tables,
  onEdit,
  onDelete,
  onToggle,
}: {
  tables: TableItem[];
  onEdit: (table: TableItem) => void;
  onDelete: (table: TableItem) => void;
  onToggle: (table: TableItem) => void;
}) {
  const { t } = useTranslation();

  return (
    <Table className="min-w-[640px] [&_th]:text-start">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{t("tables.columns.number")}</TableHead>
          <TableHead>{t("tables.columns.name")}</TableHead>
          <TableHead>{t("tables.columns.status")}</TableHead>
          <TableHead className="text-end">{t("tables.columns.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tables.map((table) => (
          <TableRow key={table.id} className="hover:bg-slate-50/70">
            <TableCell>
              <span className="whitespace-nowrap font-mono text-sm font-semibold text-slate-900">
                #{table.number}
              </span>
            </TableCell>
            <TableCell>
              <span
                className={cn(
                  "font-medium text-slate-900",
                  !table.name && "italic text-slate-400"
                )}
              >
                {table.name || "—"}
              </span>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Switch
                  checked={table.isAvailable}
                  onCheckedChange={() => onToggle(table)}
                  aria-label={t("tables.columns.status")}
                />
                <Badge
                  variant={table.isAvailable ? "outline" : "secondary"}
                  className={cn(
                    table.isAvailable
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  )}
                >
                  {table.isAvailable ? t("tables.available") : t("tables.unavailable")}
                </Badge>
              </div>
            </TableCell>
            <TableCell className="text-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => onEdit(table)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(table)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                    {t("common.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TablesTableSkeleton() {
  const { t } = useTranslation();

  return (
    <Table className="min-w-[640px] [&_th]:text-start">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{t("tables.columns.number")}</TableHead>
          <TableHead>{t("tables.columns.name")}</TableHead>
          <TableHead>{t("tables.columns.status")}</TableHead>
          <TableHead className="text-end">{t("tables.columns.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }, (_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            <TableCell>
              <Skeleton className="h-5 w-12" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-40 max-w-full" />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-10 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </TableCell>
            <TableCell className="text-end">
              <Skeleton className="ml-auto h-8 w-8 rounded-md" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
