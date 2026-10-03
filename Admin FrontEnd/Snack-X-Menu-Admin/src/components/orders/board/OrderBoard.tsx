import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { AddOrderDialog, AddOrderValues } from "@/components/orders/board/AddOrderDialog";
import { AddStatusInput } from "@/components/orders/board/AddStatusInput";
import { BoardSearchBar } from "@/components/orders/board/BoardSearchBar";
import { OrderCardView } from "@/components/orders/board/OrderCard";
import { OrderColumn } from "@/components/orders/board/OrderColumn";
import { RemoveStatusDialog } from "@/components/orders/board/RemoveStatusDialog";
import { StatusFormSheet, StatusFormValues } from "@/components/orders/StatusFormSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useOrdersBoard } from "@/hooks/useOrdersBoard";
import {
  useCreateStatusFast,
  useDeleteOrderStatus,
  useUpdateOrderStatus,
} from "@/hooks/useOrderStatuses";
import { readApiError } from "@/lib/apiErrors";
import {
  arrayMoveInMap,
  cloneBoard,
  columnStatusKey,
  filterOrders,
  findStatusKey,
  groupByStatus,
  isColumnOverId,
  moveOrderInto,
  nextOrderNumber,
  orderIndexIn,
  OrdersByStatus,
} from "@/lib/orderBoardUtils";
import type { BoardOrderItem, OrderStatusItem } from "@/types";

const BOARD_CURRENCY = "MAD";

type StatusSheetState = {
  open: boolean;
  editing: OrderStatusItem | null;
};

export function OrderBoard() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { user } = useAuth();
  const isOwner = user?.role === "TenantOwner";

  const board = useOrdersBoard();
  const createFastStatus = useCreateStatusFast();
  const updateStatus = useUpdateOrderStatus();
  const deleteStatus = useDeleteOrderStatus();

  const [search, setSearch] = useState("");
  const [addOrderStatusId, setAddOrderStatusId] = useState<number | null>(null);
  const [sheet, setSheet] = useState<StatusSheetState>({ open: false, editing: null });
  const [removingStatus, setRemovingStatus] = useState<OrderStatusItem | null>(null);
  const [removingBusy, setRemovingBusy] = useState(false);
  const [addingStatus, setAddingStatus] = useState(false);
  const [fastError, setFastError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<BoardOrderItem | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const dragSnapshot = useRef<OrdersByStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const resolveOverKey = useCallback(
    (map: OrdersByStatus, overId: string): string | null => {
      if (isColumnOverId(overId)) return columnStatusKey(overId);
      return findStatusKey(map, overId);
    },
    []
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const cardId = event.active.id as string;
      const map = board.getByStatus();
      const key = findStatusKey(map, cardId);
      const order = key ? (map[key] ?? []).find((o) => o.id === cardId) ?? null : null;
      dragSnapshot.current = cloneBoard(map);
      setActiveId(cardId);
      setActiveCard(order);
      setDragging(true);
    },
    [board]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;
      const activeId = active.id as string;
      const overId = over.id as string;
      const map = board.getByStatus();
      const activeKey = findStatusKey(map, activeId);
      if (!activeKey) return;
      const overKey = resolveOverKey(map, overId);
      if (!overKey) return;
      setHoveredKey(overKey);
      if (activeKey === overKey) return;

      let targetIndex: number;
      if (isColumnOverId(overId)) {
        targetIndex = map[overKey]?.length ?? 0;
      } else {
        const idx = orderIndexIn(map, overKey, overId);
        targetIndex = idx === -1 ? (map[overKey]?.length ?? 0) : idx;
      }
      board.setMapOptimistic((prev) => moveOrderInto(prev, activeId, overKey, targetIndex).next);
    },
    [board, resolveOverKey]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const cardId = active.id as string;
      const map = board.getByStatus();
      const activeKey = findStatusKey(map, cardId);

      if (over && activeKey) {
        const overId = over.id as string;
        const overKey = resolveOverKey(map, overId);
        if (overKey === activeKey) {
          if (!isColumnOverId(overId)) {
            board.setMapOptimistic((prev) => arrayMoveInMap(prev, cardId, overId));
          } else {
            board.setMapOptimistic((prev) =>
              moveOrderInto(prev, cardId, overKey, (prev[overKey]?.length ?? 0) + 1).next
            );
          }
        } else if (overKey) {
          let targetIndex = map[overKey]?.length ?? 0;
          if (!isColumnOverId(overId)) {
            const idx = orderIndexIn(map, overKey, overId);
            if (idx !== -1) targetIndex = idx;
          }
          board.setMapOptimistic((prev) =>
            moveOrderInto(prev, cardId, overKey, targetIndex).next
          );
        }
      }

      const ok = board.commitCurrent();
      if (!ok && dragSnapshot.current) {
        board.restoreMap(dragSnapshot.current);
        toast.error(t("orders.board.moveFailed"));
      }
      dragSnapshot.current = null;
      setActiveId(null);
      setActiveCard(null);
      setDragging(false);
      setHoveredKey(null);
    },
    [board, resolveOverKey, t]
  );

  const handleDragCancel = useCallback(() => {
    if (dragSnapshot.current) board.restoreMap(dragSnapshot.current);
    dragSnapshot.current = null;
    setActiveId(null);
    setActiveCard(null);
    setDragging(false);
    setHoveredKey(null);
  }, [board]);

  const filteredFlat = useMemo(
    () => filterOrders(board.flatOrders, search),
    [board.flatOrders, search]
  );
  const filteredMap = useMemo(() => groupByStatus(filteredFlat), [filteredFlat]);

  const nextDisplayOrder = useMemo(() => {
    const max = board.sortedStatuses.reduce((acc, status) => Math.max(acc, status.displayOrder), 0);
    return max + 1;
  }, [board.sortedStatuses]);

  const existingStatusNames = useMemo(
    () => board.sortedStatuses.map((status) => status.name),
    [board.sortedStatuses]
  );

  const addOrderStatus = useMemo(
    () => board.sortedStatuses.find((status) => status.id === addOrderStatusId) ?? null,
    [addOrderStatusId, board.sortedStatuses]
  );

  const removingOrderCount = removingStatus
    ? (board.getByStatus()[String(removingStatus.id)]?.length ?? 0)
    : 0;
  const removeTargets = useMemo(
    () => board.sortedStatuses.filter((status) => status.id !== removingStatus?.id),
    [board.sortedStatuses, removingStatus]
  );

  const handleStatusSubmit = useCallback(
    async (values: StatusFormValues) => {
      if (!sheet.editing) return;
      await updateStatus.mutateAsync({
        id: sheet.editing.id,
        payload: {
          name: values.name,
          color: values.color,
          displayOrder: values.displayOrder,
          isFinal: values.isFinal,
        },
      });
      setSheet({ open: false, editing: null });
    },
    [sheet.editing, updateStatus]
  );

  const handleFastStatusSubmit = useCallback(
    async (name: string) => {
      setFastError(null);
      try {
        await createFastStatus.mutateAsync(name);
        setAddingStatus(false);
      } catch (err) {
        setFastError(readApiError(err, t("orders.board.createStatusError")));
      }
    },
    [createFastStatus, t]
  );

  const handleAddOrderSubmit = useCallback(
    async (values: AddOrderValues): Promise<boolean> => {
      if (addOrderStatusId === null) return false;
      const orderNumber = nextOrderNumber(board.flatOrders);
      const total =
        Math.round(values.items.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100;
      const order: BoardOrderItem = {
        id: crypto.randomUUID(),
        orderNumber,
        tableId: values.tableId,
        tableName: values.tableName,
        statusId: addOrderStatusId,
        total,
        currencyCode: BOARD_CURRENCY,
        createdAt: new Date().toISOString(),
        items: values.items,
      };
      const ok = board.addOrder(order, addOrderStatusId);
      if (!ok) {
        toast.error(t("orders.board.moveFailed"));
        return false;
      }
      toast.success(t("orders.addOrder.toastSuccess", { number: orderNumber }));
      return true;
    },
    [addOrderStatusId, board, t]
  );

  const handleRemoveConfirm = useCallback(
    async (targetId: number | null) => {
      if (!removingStatus) return;
      const snapshot = cloneBoard(board.getByStatus());
      if (targetId !== null) {
        const ok = board.moveOrdersToStatus(removingStatus.id, targetId);
        if (!ok) {
          toast.error(t("orders.board.moveFailed"));
          return;
        }
      }
      setRemovingBusy(true);
      try {
        await deleteStatus.mutateAsync(removingStatus.id);
        board.removeEmptyStatus(removingStatus.id);
        toast.success(t("orders.toast.deleteSuccess"));
        setRemovingStatus(null);
      } catch (err) {
        board.restoreMap(snapshot);
        toast.error(readApiError(err, t("orders.toast.deleteError")));
      } finally {
        setRemovingBusy(false);
      }
    },
    [board, deleteStatus, removingStatus, t]
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <BoardSearchBar value={search} onValueChange={setSearch} />
        <p className="text-xs text-slate-400" aria-hidden>
          {t("orders.board.dragHint")}
        </p>
      </div>

      {board.statusesLoading && (
        <div className="flex shrink-0 gap-4 overflow-x-auto pb-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="w-72 shrink-0 space-y-3 rounded-2xl bg-slate-100 p-3 dark:bg-slate-800/60">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      )}

      {board.fallbackStatuses && board.sortedStatuses.length > 0 && (
        <div
          role="status"
          className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 shrink-0"
        >
          {t("orders.board.statusesFallback")}
        </div>
      )}

      {search.trim() !== "" && filteredFlat.length === 0 && (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 shrink-0">
          {t("orders.board.filterEmpty")}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        measuring={{ droppable: { strategy: MeasuringStrategy.WhileDragging } }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex min-h-0 flex-1 items-stretch gap-4 overflow-x-auto overflow-y-hidden pt-0.5 pb-1">
          {board.sortedStatuses.map((status) => {
            const statusKey = String(status.id);
            return (
              <OrderColumn
                key={status.id}
                status={status}
                orders={filteredMap[statusKey] ?? []}
                statusKey={statusKey}
                language={language}
                currencyCode={BOARD_CURRENCY}
                isOwner={isOwner}
                dragging={dragging}
                hovered={hoveredKey === statusKey}
                activeId={activeId}
                onAddOrder={setAddOrderStatusId}
                onRename={(item) => setSheet({ open: true, editing: item })}
                onRemove={setRemovingStatus}
              />
            );
          })}

          {isOwner && board.sortedStatuses.length > 0 &&
            (addingStatus ? (
              <AddStatusInput
                existingNames={existingStatusNames}
                isSaving={createFastStatus.isPending}
                error={fastError}
                onSubmit={handleFastStatusSubmit}
                onCancel={() => {
                  setAddingStatus(false);
                  setFastError(null);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingStatus(true)}
                className="flex h-40 w-64 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-medium text-slate-400 transition hover:border-orange-400 hover:text-orange-500 dark:border-slate-600 dark:text-slate-500 dark:hover:border-orange-400 dark:hover:text-orange-400"
              >
                <Plus className="h-5 w-5" aria-hidden />
                {t("orders.board.addStatus")}
              </button>
            ))}

          <div className="w-4 shrink-0" aria-hidden />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div className="w-72">
              <OrderCardView order={activeCard} language={language} dimmed={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <AddOrderDialog
        open={addOrderStatusId !== null}
        onOpenChange={(open) => !open && setAddOrderStatusId(null)}
        statusName={addOrderStatus?.name ?? ""}
        language={language}
        currencyCode={BOARD_CURRENCY}
        onSubmit={handleAddOrderSubmit}
      />

      <StatusFormSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((prev) => ({ ...prev, open }))}
        editing={sheet.editing}
        nextDisplayOrder={nextDisplayOrder}
        onSubmit={handleStatusSubmit}
      />

      <RemoveStatusDialog
        status={removingStatus}
        open={removingStatus !== null}
        onOpenChange={(open) => !open && setRemovingStatus(null)}
        orderCount={removingOrderCount}
        targets={removeTargets}
        busy={removingBusy}
        onConfirm={handleRemoveConfirm}
      />
    </div>
  );
}