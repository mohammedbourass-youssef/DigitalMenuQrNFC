import axios from "axios";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  getCurrentOrders,
  OrderMoveError,
  updateOrderStatus,
} from "@/services/orderService";
import {
  collectOrderIds,
  findOrder,
  insertOrderInFirstColumn,
  mergeLiveOrders,
  moveOrderToColumn,
  reorderWithinColumn,
} from "@/lib/orderBoardUtils";
import { readApiError } from "@/lib/apiErrors";
import type { OrderStatusColumnDto, OrderSummaryDto } from "@/types/orders";

/** Shared so a payment can invalidate the board without a second copy of the key. */
export const CURRENT_ORDERS_KEY = ["orders", "current-orders"] as const;

/** How long a live-arrived card keeps its highlight (matches the CSS animation). */
const NEW_ORDER_HIGHLIGHT_MS = 2600;

/** Upper bound for orders inserted from the hub that no response confirmed yet. */
const MAX_PENDING_LIVE_ORDERS = 30;

export interface UseCurrentOrdersOptions {
  /**
   * Awaited before the first REST fetch so the live subscription is already in
   * place. Read lazily: the page creates the promise in a hook that runs before
   * this one.
   */
  subscriptionGate?: MutableRefObject<Promise<void> | null>;
}

/**
 * Owns the orders board: one request on first load, an explicit refresh, and the
 * local (optimistic) column state used while dragging.
 */
export function useCurrentOrders(options: UseCurrentOrdersOptions = {}) {
  const { t } = useTranslation();
  const { subscriptionGate } = options;

  const queryFn = useCallback(async () => {
    // Subscribe first, fetch second: otherwise an order created between the two
    // would be in neither response.
    if (subscriptionGate?.current) await subscriptionGate.current;
    return getCurrentOrders();
  }, [subscriptionGate]);

  const query = useQuery({
    queryKey: CURRENT_ORDERS_KEY,
    queryFn,
    // One request for the whole session: no polling, no focus/reconnect/mount refetch.
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
  });

  const [columns, setColumns] = useState<OrderStatusColumnDto[] | null>(null);
  const columnsRef = useRef<OrderStatusColumnDto[] | null>(null);

  // Orders with a status change still in flight: their cards cannot be dragged again.
  const [pendingOrderIds, setPendingOrderIds] = useState<ReadonlySet<string>>(
    () => new Set<string>()
  );
  const pendingRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef<Set<AbortController>>(new Set());

  /** Orders inserted from the hub that no REST response has confirmed yet. */
  const liveOrdersRef = useRef<OrderSummaryDto[]>([]);
  const [newOrderIds, setNewOrderIds] = useState<ReadonlySet<string>>(() => new Set());
  const highlightTimersRef = useRef<number[]>([]);

  // Every successful load (first one and each refresh) replaces the board, so
  // local-only moves never survive a refresh. That is expected. Live orders the
  // response does not know about yet are merged back in, though.
  useEffect(() => {
    if (!query.data) return;

    // Once the server reports an order it is no longer local-only.
    const confirmed = collectOrderIds(query.data);
    liveOrdersRef.current = liveOrdersRef.current.filter(
      (order) => !confirmed.has(order.orderId)
    );

    const next = mergeLiveOrders(query.data, liveOrdersRef.current);
    columnsRef.current = next;
    setColumns(next);
  }, [query.data]);

  const commit = useCallback((next: OrderStatusColumnDto[]) => {
    columnsRef.current = next;
    setColumns(next);
  }, []);

  const highlightOrder = useCallback((orderId: string) => {
    setNewOrderIds((previous) => new Set(previous).add(orderId));

    const timer = window.setTimeout(() => {
      setNewOrderIds((previous) => {
        if (!previous.has(orderId)) return previous;
        const next = new Set(previous);
        next.delete(orderId);
        return next;
      });
    }, NEW_ORDER_HIGHLIGHT_MS);

    highlightTimersRef.current.push(timer);
  }, []);

  useEffect(
    () => () => {
      highlightTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    },
    []
  );

  /** Inserts an order pushed by the hub at the top of the first status column. */
  const addLiveOrder = useCallback(
    (order: OrderSummaryDto) => {
      const current = columnsRef.current;
      // Before the first load there is no board to insert into, and because the
      // fetch waits for the subscription that response already has the order.
      if (!current) return;
      // The REST list and the hub can both report the same order.
      if (findOrder(current, order.orderId)) return;

      const next = insertOrderInFirstColumn(current, order);
      if (next === current) return;

      commit(next);
      liveOrdersRef.current = [order, ...liveOrdersRef.current].slice(
        0,
        MAX_PENDING_LIVE_ORDERS
      );
      highlightOrder(order.orderId);
    },
    [commit, highlightOrder]
  );

  const setPending = useCallback((orderId: string, pending: boolean) => {
    if (pendingRef.current.has(orderId) === pending) return;
    if (pending) pendingRef.current.add(orderId);
    else pendingRef.current.delete(orderId);
    setPendingOrderIds(new Set(pendingRef.current));
  }, []);

  // Leaving the page cancels the moves that are still on the wire.
  useEffect(() => {
    const inFlight = inFlightRef.current;
    return () => {
      for (const controller of inFlight) controller.abort();
      inFlight.clear();
    };
  }, []);

  /** Manual refresh: keeps the old board visible, toasts on failure. */
  const refresh = useCallback(async () => {
    try {
      await query.refetch({ throwOnError: true });
    } catch (error) {
      toast.error(readApiError(error, t("orders.board.refreshFailed")));
    }
  }, [query.refetch, t]);

  const previewMove = useCallback(
    (orderId: string, toStatusId: number, toIndex?: number) => {
      const current = columnsRef.current;
      if (!current) return;
      const next = moveOrderToColumn(current, orderId, toStatusId, toIndex);
      if (next !== current) commit(next);
    },
    [commit]
  );

  const previewReorder = useCallback(
    (orderId: string, overOrderId: string) => {
      const current = columnsRef.current;
      if (!current) return;
      const next = reorderWithinColumn(current, orderId, overOrderId);
      if (next !== current) commit(next);
    },
    [commit]
  );

  /**
   * Called once on drop. The board was already moved optimistically; if the
   * status change cannot be persisted we restore the snapshot captured when the
   * drag started (never the already-moved state) and warn.
   */
  const persistStatusChange = useCallback(
    async (
      orderId: string,
      toStatusId: number,
      snapshot?: OrderStatusColumnDto[] | null
    ) => {
      // A previous drop for this order is still in flight: ignore the new one.
      if (pendingRef.current.has(orderId)) return;
      setPending(orderId, true);

      const controller = new AbortController();
      inFlightRef.current.add(controller);

      try {
        await updateOrderStatus(orderId, toStatusId, controller.signal);
        // The server knows about this order now, so a later refresh must not
        // re-insert it at the top of the first column.
        liveOrdersRef.current = liveOrdersRef.current.filter(
          (order) => order.orderId !== orderId
        );
      } catch (error) {
        // Aborted while unmounting: stay silent, the board is gone anyway.
        if (axios.isCancel(error)) return;

        const rollback = snapshot ?? columnsRef.current;
        if (rollback) commit(rollback);

        if (error instanceof OrderMoveError && error.code === "conflict") {
          toast.error(t("orders.board.moveConflict"));
          // Lost the race: the server copy is the only correct one now.
          await refresh();
        } else {
          const detail = error instanceof OrderMoveError ? error.message.trim() : "";
          toast.error(detail || readApiError(error, t("orders.board.moveFailed")));
        }
      } finally {
        inFlightRef.current.delete(controller);
        setPending(orderId, false);
      }
    },
    [commit, refresh, setPending, t]
  );

  const restore = useCallback(
    (snapshot: OrderStatusColumnDto[] | null) => {
      if (snapshot) commit(snapshot);
    },
    [commit]
  );

  const statusIdOfOrder = useCallback(
    (orderId: string): number | null => {
      const current = columnsRef.current;
      if (!current) return null;
      const location = findOrder(current, orderId);
      if (!location) return null;
      return current[location.columnIndex].statusId;
    },
    []
  );

  const getColumns = useCallback((): OrderStatusColumnDto[] | null => columnsRef.current, []);

  return {
    columns,
    pendingOrderIds,
    newOrderIds,
    isInitialLoading: query.isPending,
    isRefreshing: query.isFetching && !query.isPending,
    isLoadError: query.isError && !query.data,
    hasData: query.data !== undefined,
    lastUpdatedAt: query.dataUpdatedAt || null,
    refresh,
    previewMove,
    previewReorder,
    persistStatusChange,
    addLiveOrder,
    restore,
    statusIdOfOrder,
    getColumns,
  };
}

export type UseCurrentOrdersReturn = ReturnType<typeof useCurrentOrders>;