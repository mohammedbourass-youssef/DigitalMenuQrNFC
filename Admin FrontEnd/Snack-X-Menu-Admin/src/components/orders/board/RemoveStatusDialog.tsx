import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderStatusItem } from "@/types";

interface RemoveStatusDialogProps {
  status: OrderStatusItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderCount: number;
  targets: OrderStatusItem[];
  busy: boolean;
  onConfirm: (targetId: number | null) => Promise<void>;
}

export function RemoveStatusDialog({
  status,
  open,
  onOpenChange,
  orderCount,
  targets,
  busy,
  onConfirm,
}: RemoveStatusDialogProps) {
  const { t } = useTranslation();
  const [targetId, setTargetId] = useState<string>("");

  const handleOpenChange = (next: boolean) => {
    if (!next && busy) return;
    if (next) setTargetId("");
    onOpenChange(next);
  };

  const target = targets.find((item) => String(item.id) === targetId) ?? null;
  const requiresTarget = orderCount > 0;
  const canConfirm = !requiresTarget || (target !== null && !busy);

  const confirm = async () => {
    if (!canConfirm || !status) return;
    await onConfirm(requiresTarget ? target?.id ?? null : null);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {status ? t("orders.removeStatus.title", { name: status.name }) : ""}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("orders.removeStatus.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requiresTarget && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              {t("orders.removeStatus.moveLabel")}
            </Label>
            <Select value={targetId} onValueChange={setTargetId} disabled={busy}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("orders.removeStatus.movePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {targets.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              {t("orders.removeStatus.orderCount", { count: orderCount })}
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction type="button" onClick={() => void confirm()} disabled={!canConfirm}>
            {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />}
            {t("orders.removeStatus.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}