import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useOrderStatuses } from "@/hooks/useOrderStatuses";
import {
  cloneBoard,
  dropEmptyStatus,
  flattenByStatus,
  groupByStatus,
  moveOrderInto,
  moveStatusOrders,
  OrdersByStatus,
} from "@/lib/orderBoardUtils";
import { loadMockBoardOrders, MOCK_STATUSES, saveMockBoardOrders } from "@/lib/mockBoardOrders";
import type { BoardOrderItem, OrderStatusItem } from "@/types";

/**
 * Board state backed by mock data (kept in localStorage so moves survive reloads)
 * and, when available, the real order-statuses endpoint for the columns.
 */
export function useOrdersBoard() {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const statusesQuery = useOrderStatuses(lang);
  const statuses: OrderStatusItem[] | null = useMemo(() => {
    if (!statusesQuery.isPending && !statusesQuery.isError) {
      const rows = statusesQuery.data ?? [];
      if (rows.length > 0) return rows;
    }
    return null;
  }, [
    statusesQuery.data,
    statusesQuery.isError,
    statusesQuery.isPending,
  ]);

  const statusesLoading = statusesQuery.isPending && statuses === null;
  const statusesError = statusesQuery.isError && statuses === null;
  const fallbackStatuses = statusesQuery.isError || statusesError;

  const [byStatus, setByStatus] = useState<OrdersByStatus>(() =>
    groupByStatus(loadMockBoardOrders())
  );
  const byStatusRef = useRef<OrdersByStatus>(byStatus);

  const updateMap = useCallback((next: OrdersByStatus) => {
    byStatusRef.current = next;
    setByStatus(next);
  }, []);

  const setMapOptimistic = useCallback((updater: (prev: OrdersByStatus) => OrdersByStatus) => {
    const next = updater(byStatusRef.current);
    updateMap(next);
    return next;
  }, [updateMap]);

  /** Persists the current map. Returns false when storage failed. */
  const persist = useCallback((map: OrdersByStatus): boolean => {
    try {
      return saveMockBoardOrders(flattenByStatus(map));
    } catch {
      return false;
    }
  }, []);

  const restoreMap = useCallback((snapshot: OrdersByStatus) => {
    updateMap(cloneBoard(snapshot));
  }, [updateMap]);

  const commitCurrent = useCallback(
    (map?: OrdersByStatus): boolean => {
      const current = map ?? byStatusRef.current;
      return persist(current);
    },
    [persist]
  );

  /** Moves a single order into a status at an index (0 = top). Persists by default. */
  const moveOrder = useCallback(
    (orderId: string, targetStatusId: number, targetIndex: number, shouldPersist = true): boolean => {
      const targetKey = String(targetStatusId);
      const { next } = moveOrderInto(byStatusRef.current, orderId, targetKey, targetIndex);
      updateMap(next);
      return shouldPersist ? persist(next) : true;
    },
    [persist, updateMap]
  );

  /** Inserts a new order at the top of the given status column. */
  const addOrder = useCallback(
    (order: BoardOrderItem, statusId: number): boolean => {
      const key = String(statusId);
      const current = byStatusRef.current;
      const next = {
        ...current,
        [key]: [order, ...(current[key] ?? [])],
      };
      updateMap(next);
      return persist(next);
    },
    [persist, updateMap]
  );

  /** Moves every order of a status into another status, dropping the source column. */
  const moveOrdersToStatus = useCallback(
    (fromStatusId: number, toStatusId: number): boolean => {
      const next = moveStatusOrders(
        byStatusRef.current,
        String(fromStatusId),
        String(toStatusId)
      );
      updateMap(next);
      return persist(next);
    },
    [persist, updateMap]
  );

  /** Removes an (already empty) status key from the board. */
  const removeEmptyStatus = useCallback(
    (statusId: number): boolean => {
      const next = dropEmptyStatus(byStatusRef.current, String(statusId));
      updateMap(next);
      return persist(next);
    },
    [persist, updateMap]
  );

  const flatOrders = useMemo(() => flattenByStatus(byStatus), [byStatus]);

  const sortedStatuses: OrderStatusItem[] =
    statuses ??
    [...MOCK_STATUSES].sort(
      (a, b) => a.displayOrder - b.displayOrder
    );

  return {
    sortedStatuses,
    statuses,
    fallbackStatuses,
    statusesLoading,
    statusesError,
    refetchStatuses: statusesQuery.refetch,
    byStatus,
    flatOrders,
    getByStatus: () => byStatusRef.current,
    moveOrder,
    addOrder,
    moveOrdersToStatus,
    removeEmptyStatus,
    setMapOptimistic,
    restoreMap,
    commitCurrent,
  };
}

export type UseOrdersBoardReturn = ReturnType<typeof useOrdersBoard>;