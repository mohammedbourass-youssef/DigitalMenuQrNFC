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
import { RefreshCw } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { BoardSearchBar } from "@/components/orders/board/BoardSearchBar";
import { OrderCardSkeleton } from "@/components/orders/board/OrderCardSkeleton";
import { OrderCardView } from "@/components/orders/board/OrderCard";
import { OrderColumn } from "@/components/orders/board/OrderColumn";
import { useCurrentOrders, type UseCurrentOrdersReturn } from "@/hooks/useCurrentOrders";
import {
  filterColumns,
  isColumnId,
  resolveDropTarget,
} from "@/lib/orderBoardUtils";
import { getCurrency } from "@/lib/preferences";

const SKELETON_COLUMNS = 4;

export function OrderBoard({ board }: { board: UseCurrentOrdersReturn }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const currency = getCurrency();

  const [search, setSearch] = useState("");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    getColumns,
    statusIdOfOrder,
    previewMove,
    previewReorder,
    persistStatusChange,
    pendingOrderIds,
    newOrderIds,
    restore,
  } = board;

  const originStatusRef = useRef<number | null>(null);
  const snapshotRef = useRef<ReturnType<typeof getColumns>>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const visibleColumns = useMemo(
    () => (board.columns ? filterColumns(board.columns, search) : []),
    [board.columns, search]
  );

  const resetDrag = useCallback(() => {
    setActiveOrderId(null);
    setIsDragging(false);
    originStatusRef.current = null;
    snapshotRef.current = null;
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const orderId = String(event.active.id);
      snapshotRef.current = getColumns();
      originStatusRef.current = statusIdOfOrder(orderId);
      setActiveOrderId(orderId);
      setIsDragging(true);
    },
    [getColumns, statusIdOfOrder]
  );

  /** Live preview: the card follows the pointer across columns, no request yet. */
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const orderId = String(active.id);
      const columns = getColumns();
      if (!columns) return;

      const target = resolveDropTarget(columns, String(over.id));
      if (!target) return;
      if (statusIdOfOrder(orderId) === target.statusId) return;

      previewMove(orderId, target.statusId, target.index);
    },
    [getColumns, statusIdOfOrder, previewMove]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const orderId = String(event.active.id);
      const overId = event.over ? String(event.over.id) : null;
      const columns = getColumns();

      // A move for this order is still on the wire: never persist a second one.
      if (pendingOrderIds.has(orderId)) {
        restore(snapshotRef.current);
        resetDrag();
        return;
      }

      // Released outside every column: undo the optimistic preview, persist nothing.
      if (!columns || !overId) {
        restore(snapshotRef.current);
        resetDrag();
        return;
      }

      const target = resolveDropTarget(columns, overId);
      if (target) {
        const currentStatusId = statusIdOfOrder(orderId);
        if (currentStatusId === target.statusId) {
          if (!isColumnId(overId)) previewReorder(orderId, overId);
        } else {
          previewMove(orderId, target.statusId, target.index);
        }
      }

      const finalStatusId = statusIdOfOrder(orderId);
      const originStatusId = originStatusRef.current;
      if (
        finalStatusId !== null &&
        originStatusId !== null &&
        finalStatusId !== originStatusId
      ) {
        void persistStatusChange(orderId, finalStatusId, snapshotRef.current);
      }

      resetDrag();
    },
    [
      getColumns,
      statusIdOfOrder,
      previewMove,
      previewReorder,
      persistStatusChange,
      pendingOrderIds,
      restore,
      resetDrag,
    ]
  );

  const handleDragCancel = useCallback(() => {
    restore(snapshotRef.current);
    resetDrag();
  }, [restore, resetDrag]);

  const activeOrder = useMemo(() => {
    if (!activeOrderId || !board.columns) return null;
    for (const column of board.columns) {
      const found = column.orders.find((order) => order.orderId === activeOrderId);
      if (found) return found;
    }
    return null;
  }, [activeOrderId, board.columns]);

  if (board.isLoadError) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="max-w-sm rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-600">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t("orders.board.loadError")}
          </p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => void board.refresh()}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            {t("orders.board.retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (board.isInitialLoading && !board.columns) {
    return (
      <div className="flex shrink-0 gap-4 overflow-x-auto pb-2" aria-busy>
        {Array.from({ length: SKELETON_COLUMNS }, (_, index) => (
          <section
            key={index}
            className="flex h-72 w-[320px] shrink-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-100/80 p-3 dark:border-slate-700 dark:bg-slate-800/60"
          >
            <div className="h-1 w-full rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="h-4 w-32 rounded bg-slate-300 dark:bg-slate-700" />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <BoardSearchBar value={search} onValueChange={setSearch} />
        <p className="text-xs text-slate-400" aria-hidden>
          {t("orders.board.dragHint")}
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        measuring={{ droppable: { strategy: MeasuringStrategy.WhileDragging } }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex min-h-0 flex-1 items-stretch gap-4 overflow-x-auto overflow-y-hidden pb-1 pt-0.5">
          {visibleColumns.map((column) => (
            <OrderColumn
              key={column.statusId}
              column={column}
              language={language}
              currency={currency}
              isDragging={isDragging}
              activeOrderId={activeOrderId}
              pendingOrderIds={pendingOrderIds}
              newOrderIds={newOrderIds}
            />
          ))}
          <div className="w-4 shrink-0" aria-hidden />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeOrder ? (
            <div className="w-[320px]">
              <OrderCardView order={activeOrder} language={language} currency={currency} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}