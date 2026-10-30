import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Pencil,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { PaymentMethodBadge } from "@/components/payments/PaymentMethodBadge";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import type { TenantPaymentMethod } from "@/types/paymentMethod";

/** Matches Tailwind's `md` breakpoint so the table and the card list swap over. */
const DESKTOP_QUERY = "(min-width: 768px)";

export interface PaymentMethodsTableProps {
  methods: TenantPaymentMethod[];
  /** Ids with an in-flight request, so only that row is disabled. */
  busyIds: ReadonlySet<number>;
  onEdit: (method: TenantPaymentMethod) => void;
  onDelete: (method: TenantPaymentMethod) => void;
  onToggleEnabled: (method: TenantPaymentMethod, next: boolean) => void;
  onSetDefault: (method: TenantPaymentMethod) => void;
  onMoveUp: (method: TenantPaymentMethod) => void;
  onMoveDown: (method: TenantPaymentMethod) => void;
}

export function PaymentMethodsTable({
  methods,
  busyIds,
  onEdit,
  onDelete,
  onToggleEnabled,
  onSetDefault,
  onMoveUp,
  onMoveDown,
}: PaymentMethodsTableProps) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const canEdit = can("PaymentMethods", "edit");
  const canDelete = can("PaymentMethods", "delete");
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const firstId = methods[0]?.id;
  const lastId = methods[methods.length - 1]?.id;

  const isFirst = (method: TenantPaymentMethod) => method.id === firstId;
  const isLast = (method: TenantPaymentMethod) => method.id === lastId;

  // Only one viewport is mounted, so sortable ids are never registered twice.
  return (
    <TooltipProvider>
      {isDesktop ? (
        <div className="hidden md:block">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10" />
                <TableHead>{t("paymentsMethods.column.method")}</TableHead>
                <TableHead>{t("paymentsMethods.column.code")}</TableHead>
                <TableHead>{t("paymentsMethods.column.default")}</TableHead>
                <TableHead>{t("paymentsMethods.column.status")}</TableHead>
                <TableHead className="text-end">
                  {t("paymentsMethods.column.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {methods.map((method) => (
                <SortableDesktopRow
                  key={method.id}
                  method={method}
                  busy={busyIds.has(method.id)}
                  isFirst={isFirst(method)}
                  isLast={isLast(method)}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleEnabled={onToggleEnabled}
                  onSetDefault={onSetDefault}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <ul className="space-y-3 p-3 md:hidden">
          {methods.map((method) => (
            <SortableMobileCard
              key={method.id}
              method={method}
              busy={busyIds.has(method.id)}
              isFirst={isFirst(method)}
              isLast={isLast(method)}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleEnabled={onToggleEnabled}
              onSetDefault={onSetDefault}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          ))}
        </ul>
      )}
    </TooltipProvider>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Row / card
   ══════════════════════════════════════════════════════════════════════════ */

/** A single row's own data plus the handlers; the list itself is not needed. */
interface RowProps
  extends Pick<
    PaymentMethodsTableProps,
    | "onEdit"
    | "onDelete"
    | "onToggleEnabled"
    | "onSetDefault"
    | "onMoveUp"
    | "onMoveDown"
  > {
  method: TenantPaymentMethod;
  busy: boolean;
  isFirst: boolean;
  isLast: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

function SortableDesktopRow({ method, ...props }: RowProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: method.id, disabled: !props.canEdit });

  return (
    <TableRow
      ref={setNodeRef}
      // dnd-kit's own transform; no CSS transition on hover so the two don't fight.
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-busy={props.busy || undefined}
      data-testid={`payment-method-row-${method.id}`}
      className={cn(
        "hover:bg-slate-50/70",
        method.isDefault && "bg-amber-50/40",
        isDragging && "relative z-10 opacity-60 shadow-lg"
      )}
      {...attributes}
    >
      <TableCell className="ps-2">
        {props.canEdit && (
          <DragHandle
            label={method.label}
            activatorRef={setActivatorNodeRef}
            listeners={listeners}
          />
        )}
      </TableCell>
      <TableCell>
        <MethodIdentity method={method} />
      </TableCell>
      <TableCell>
        <span className="font-mono text-sm text-slate-500">{method.code}</span>
      </TableCell>
      <TableCell>
        <DefaultCell
          method={method}
          busy={props.busy}
          canEdit={props.canEdit}
          onSetDefault={props.onSetDefault}
        />
      </TableCell>
      <TableCell>
        <EnableCell
          method={method}
          busy={props.busy}
          canEdit={props.canEdit}
          onToggleEnabled={props.onToggleEnabled}
        />
      </TableCell>
      <TableCell className="text-end">
        <RowActions method={method} {...props} />
      </TableCell>
    </TableRow>
  );
}

function SortableMobileCard({ method, ...props }: RowProps) {
  const { t } = useTranslation();
  const { busy, onSetDefault } = props;
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: method.id, disabled: !props.canEdit });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-busy={busy || undefined}
      data-testid={`payment-method-card-${method.id}`}
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
        method.isDefault && "border-amber-300 bg-amber-50/40",
        !method.isEnabled && "opacity-60",
        isDragging && "relative z-10 shadow-lg"
      )}
      {...attributes}
    >
      <div className="flex items-start gap-3">
        <span className="mt-1 flex h-8 w-6 shrink-0 items-center justify-center">
          {props.canEdit && (
            <DragHandle
              label={method.label}
              activatorRef={setActivatorNodeRef}
              listeners={listeners}
            />
          )}
        </span>
        <MethodIdentity method={method} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <EnableCell
          method={method}
          busy={busy}
          canEdit={props.canEdit}
          onToggleEnabled={props.onToggleEnabled}
        />
        <div className="flex items-center gap-1">
          <RowActions method={method} {...props} />
        </div>
      </div>

      {props.canEdit && !method.isDefault && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          disabled={busy}
          onClick={() => onSetDefault(method)}
        >
          <Star className="me-1.5 h-3.5 w-3.5" />
          {t("paymentsMethods.setDefault")}
        </Button>
      )}
    </li>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Shared cells
   ══════════════════════════════════════════════════════════════════════════ */

type Listeners = ReturnType<typeof useSortable>["listeners"];

/**
 * The only drag activator. Holding it is enough for pointer, touch (see the
 * TouchSensor delay) and keyboard (space, then arrows, then space to drop).
 */
function DragHandle({
  label,
  activatorRef,
  listeners,
}: {
  label: string;
  activatorRef: (node: HTMLElement | null) => void;
  listeners: Listeners;
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      ref={activatorRef}
      {...listeners}
      aria-label={t("paymentsMethods.dragNamed", { name: label })}
      className="flex h-8 w-6 cursor-grab touch-none items-center justify-center rounded text-slate-300 hover:text-slate-500 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none active:cursor-grabbing"
    >
      <GripVertical className="h-4 w-4" aria-hidden />
    </button>
  );
}

/** Icon, effective label, muted catalog name when a custom label is set. */
function MethodIdentity({ method }: { method: TenantPaymentMethod }) {
  const { t } = useTranslation();
  const hasCustomLabel = Boolean(method.displayName?.trim());

  return (
    <div className="flex min-w-0 items-center gap-3">
      <PaymentMethodBadge icon={method.icon} color={method.color} label={method.label} />
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900">{method.label}</p>
        {hasCustomLabel && (
          <p className="truncate text-xs text-slate-500">{method.systemName}</p>
        )}
      </div>
      {method.isDefault && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
          {t("paymentsMethods.defaultBadge")}
        </span>
      )}
      {!method.isEnabled && (
        <Badge variant="secondary">{t("paymentsMethods.disabled")}</Badge>
      )}
    </div>
  );
}

/** Star on the default row, empty star button on the rest. */
function DefaultCell({
  method,
  busy,
  canEdit,
  onSetDefault,
}: {
  method: TenantPaymentMethod;
  busy: boolean;
  canEdit: boolean;
  onSetDefault: (method: TenantPaymentMethod) => void;
}) {
  const { t } = useTranslation();

  if (method.isDefault) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
        <Badge className="border-amber-200 bg-amber-50 text-amber-700">
          {t("paymentsMethods.defaultBadge")}
        </Badge>
      </span>
    );
  }

  if (!canEdit) return <span className="text-slate-400">—</span>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={busy}
          onClick={() => onSetDefault(method)}
          aria-label={t("paymentsMethods.setDefaultNamed", { name: method.label })}
        >
          <Star className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("paymentsMethods.setDefault")}</TooltipContent>
    </Tooltip>
  );
}

/** Inline switch, so a row never jumps to another part of the layout. */
function EnableCell({
  method,
  busy,
  canEdit,
  onToggleEnabled,
}: {
  method: TenantPaymentMethod;
  busy: boolean;
  canEdit: boolean;
  onToggleEnabled: (method: TenantPaymentMethod, next: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={method.isEnabled}
        aria-label={t(
          method.isEnabled ? "paymentsMethods.disableNamed" : "paymentsMethods.enableNamed",
          { name: method.label }
        )}
        disabled={busy || !canEdit}
        onClick={() => onToggleEnabled(method, !method.isEnabled)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full",
          "transition-colors motion-reduce:transition-none",
          "focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none",
          "disabled:opacity-60",
          method.isEnabled ? "bg-orange-500" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow",
            "transition-transform motion-reduce:transition-none",
            method.isEnabled ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
      <span className="text-xs text-slate-500">
        {t(method.isEnabled ? "paymentsMethods.enabled" : "paymentsMethods.disabled")}
      </span>
    </span>
  );
}

/** Up/down are the keyboard and touch equivalent of dragging the grip. */
function RowActions({ method, busy, isFirst, isLast, canEdit, canDelete, onEdit, onDelete, onMoveUp, onMoveDown }: RowProps) {
  const { t } = useTranslation();

  const actions: { icon: LucideIcon; label: string; disabled: boolean; onClick: () => void; danger?: boolean }[] = [
    ...(canEdit
      ? [
          {
            icon: ArrowUp,
            label: t("paymentsMethods.moveUpNamed", { name: method.label }),
            disabled: busy || isFirst,
            onClick: () => onMoveUp(method),
          },
          {
            icon: ArrowDown,
            label: t("paymentsMethods.moveDownNamed", { name: method.label }),
            disabled: busy || isLast,
            onClick: () => onMoveDown(method),
          },
          {
            icon: Pencil,
            label: t("paymentsMethods.editNamed", { name: method.label }),
            disabled: busy,
            onClick: () => onEdit(method),
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            icon: Trash2,
            label: t("paymentsMethods.deleteNamed", { name: method.label }),
            disabled: busy,
            onClick: () => onDelete(method),
            danger: true,
          },
        ]
      : []),
  ];

  return (
    <div className="flex items-center justify-end gap-1">
      {actions.map(({ icon: Icon, label, disabled, onClick, danger }) => (
        <Tooltip key={label}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", danger && "text-red-600 hover:text-red-600")}
              disabled={disabled}
              onClick={onClick}
              aria-label={label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}