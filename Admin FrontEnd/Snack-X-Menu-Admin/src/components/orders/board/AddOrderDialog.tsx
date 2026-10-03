import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/orderBoardUtils";
import { MOCK_TABLES } from "@/lib/mockBoardOrders";
import type { BoardOrderLine } from "@/types";

export interface AddOrderValues {
  tableId: string | null;
  tableName: string | null;
  items: BoardOrderLine[];
}

interface AddOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusName: string;
  language: string;
  currencyCode: string;
  onSubmit: (values: AddOrderValues) => Promise<boolean>;
}

interface ItemRow {
  key: string;
  name: string;
  quantity: string;
  price: string;
}

let rowKey = 0;
const newRow = (): ItemRow => ({
  key: `row-${++rowKey}`,
  name: "",
  quantity: "1",
  price: "",
});

function parseItem(row: ItemRow): BoardOrderLine | null {
  const name = row.name.trim();
  if (!name) return null;
  const quantity = Number.parseInt(row.quantity, 10);
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  const unitPrice = Number.parseFloat(row.price);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return null;
  const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
  return { name, quantity, unitPrice, lineTotal };
}

export function AddOrderDialog({
  open,
  onOpenChange,
  statusName,
  language,
  currencyCode,
  onSubmit,
}: AddOrderDialogProps) {
  const { t } = useTranslation();
  const [tableId, setTableId] = useState<string>("takeaway");
  const [rows, setRows] = useState<ItemRow[]>(() => [newRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = () => {
    setTableId("takeaway");
    setRows([newRow()]);
    setErrorMessage(null);
    setIsSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && isSubmitting) return;
    if (next) reset();
    onOpenChange(next);
  };

  const parsedItems = rows.map((row) => parseItem(row));
  const validItems = parsedItems.filter((item): item is BoardOrderLine => item !== null);
  const hasInvalidRow = rows.some(
    (row, index) =>
      row.name.trim().length > 0 &&
      parsedItems[index] === null
  );
  const total = validItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const canSubmit = validItems.length > 0 && !hasInvalidRow && !isSubmitting;

  const selectedTable = MOCK_TABLES.find((table) => table.id === tableId) ?? null;

  const handleSubmit = async () => {
    if (!canSubmit) {
      setErrorMessage(
        validItems.length === 0
          ? t("orders.addOrder.noItems")
          : t("orders.addOrder.invalidItem")
      );
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    const ok = await onSubmit({
      tableId: selectedTable?.id ?? null,
      tableName: selectedTable?.name ?? null,
      items: validItems,
    });
    if (ok) {
      onOpenChange(false);
      reset();
    } else {
      setIsSubmitting(false);
      setErrorMessage(t("orders.addOrder.saveFailed"));
    }
  };

  const updateRow = (key: string, patch: Partial<ItemRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addRow = () => setRows((prev) => [...prev, newRow()]);
  const removeRow = (key: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.key !== key) : prev));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("orders.addOrder.title")}</DialogTitle>
          <DialogDescription>
            {t("orders.addOrder.description", { status: statusName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
            >
              {errorMessage}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              {t("orders.addOrder.tableLabel")}
            </Label>
            <Select value={tableId} onValueChange={setTableId} disabled={isSubmitting}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("orders.addOrder.takeaway")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="takeaway">{t("orders.addOrder.takeaway")}</SelectItem>
                {MOCK_TABLES.map((table) => (
                  <SelectItem key={table.id} value={table.id as string}>
                    {table.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-700">
                {t("orders.addOrder.itemsLabel")}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                disabled={isSubmitting}
              >
                <Plus className="me-1 h-3.5 w-3.5" aria-hidden />
                {t("orders.addOrder.addItem")}
              </Button>
            </div>

            <div className="space-y-2">
              {rows.map((row, index) => {
                const invalid = row.name.trim() !== "" && parsedItems[index] === null;
                return (
                  <div key={row.key} className="grid grid-cols-12 items-center gap-2">
                    <div className="col-span-6">
                      <Input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRow(row.key, { name: e.target.value })}
                        placeholder={t("orders.addOrder.itemNamePlaceholder")}
                        aria-label={`${t("orders.addOrder.itemName")} ${index + 1}`}
                        aria-invalid={invalid}
                        disabled={isSubmitting}
                        className="h-10"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                        aria-label={`${t("orders.addOrder.quantity")} ${index + 1}`}
                        aria-invalid={invalid}
                        disabled={isSubmitting}
                        className="h-10"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.price}
                        onChange={(e) => updateRow(row.key, { price: e.target.value })}
                        aria-label={`${t("orders.addOrder.price")} ${index + 1}`}
                        aria-invalid={invalid}
                        disabled={isSubmitting}
                        className="h-10"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.key)}
                        disabled={isSubmitting || rows.length <= 1}
                        aria-label={t("orders.addOrder.removeItem")}
                        className="h-10 w-10 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {t("orders.addOrder.total")}
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatMoney(total, language, currencyCode)}
            </span>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              {t("common.cancel")}
            </Button>
          </DialogClose>
          <Button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit}>
            {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />}
            {t("orders.addOrder.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}