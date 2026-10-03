import { Lock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { OrderStatusItem } from "@/types";

interface ColumnMenuProps {
  status: OrderStatusItem;
  isOwner: boolean;
  onRename: (status: OrderStatusItem) => void;
  onRemove: (status: OrderStatusItem) => void;
}

export function ColumnMenu({ status, isOwner, onRename, onRemove }: ColumnMenuProps) {
  const { t } = useTranslation();

  if (status.isSystem) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-300 dark:text-slate-600">
              <Lock className="h-3.5 w-3.5" aria-hidden />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("orders.statuses.systemTooltip")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!isOwner) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          aria-label={t("orders.board.columnActions", { name: status.name })}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onSelect={() => onRename(status)}
          className="cursor-pointer"
        >
          <Pencil className="me-2 h-4 w-4 text-slate-400" aria-hidden />
          {t("orders.board.columnRename")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => onRemove(status)}
          className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
        >
          <Trash2 className="me-2 h-4 w-4" aria-hidden />
          {t("orders.board.columnRemove")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}