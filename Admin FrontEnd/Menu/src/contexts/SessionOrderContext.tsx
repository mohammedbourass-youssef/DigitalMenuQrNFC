import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ApiError, isAbortError, SessionExpiredError } from '@/lib/errors';
import { clearActiveOrder, loadActiveOrder, saveActiveOrder } from '@/lib/activeOrder';
import { useTenant } from '@/contexts/TenantContext';
import { getOrderTracking } from '@/services/orderService';
import { beginSessionRecovery } from '@/lib/sessionRecovery';
import {
  classifyTrackingError,
  compareTracking,
  mapOrderTracking,
  markJustCompleted,
} from '@/lib/orderTracking';
import type { CurrencyCode } from '@/lib/constants';
import type { OrderTrackingView } from '@/types/order';

/** Poll cadence for the tracking screen. */
const POLL_INTERVAL_MS = 10_000;

/**
 * Backoff applied after a failed refresh.
 *
 * A dropped poll means the kitchen's connection hiccupped, not that the customer
 * needs to see an error every ten seconds, so failures are retried progressively
 * less often. A success resets the position.
 */
const ERROR_BACKOFF_MS = [20_000, 40_000, 60_000] as const;

/** How long the "your order moved to X" banner stays on screen. */
export const STATUS_BANNER_MS = 4_000;

/**
 * ISO instant to epoch milliseconds.
 *
 * The persisted snapshot stores a number while the endpoint sends an ISO string,
 * and a hand-edited or malformed value must not become `NaN` in localStorage.
 */
function toEpochMs(value: string | null): number {
  if (!value) return Date.now();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

/** A status transition worth telling the customer about. */
export interface StatusUpdate {
  /** Already server-translated for the request's language. */
  statusName: string;
  color: string;
  /**
   * Wall-clock stamp of the transition. Included in the state so the same
   * transition is announced again if the customer returns to the screen.
   */
  at: number;
}

export interface SessionOrderValue {
  /** Id of the session's order, or `null` when the session has none yet. */
  orderId: string | null;
  /** True when this session already has an order — gates create vs add. */
  hasOrder: boolean;
  /** Normalized tracking view, or `null` before the first refresh resolves. */
  tracking: OrderTrackingView | null;
  /** True during the first load. Background polls do not set this. */
  isLoading: boolean;
  /** True while a refresh is in flight, for the quiet progress indicator. */
  isRefreshing: boolean;
  /** Set when a refresh failed and we have no order to show. */
  error: string | null;
  /** The server reported this order no longer exists for this session. */
  isOrderGone: boolean;
  /** Set while a session failure awaits the global re-mint. */
  sessionError: Error | null;
  /**
   * Refreshes immediately and shows the blocking spinner. Collapses onto an
   * in-flight request rather than racing it.
   */
  refetch: () => Promise<void>;
  /** Quiet refresh used by polling, focus/online handlers and post-add. */
  refreshInBackground: () => Promise<void>;
  /** True once the order reaches a terminal status — stops polling. */
  isFinal: boolean;
  /** The server's own answer for whether more items may be added. */
  canAddItems: boolean;
  /** The most recent status transition, for the banner. `null` once dismissed. */
  statusUpdate: StatusUpdate | null;
  dismissStatusUpdate: () => void;
  /**
   * Forgets the current order and returns to an empty session.
   *
   * Offered only once the server says the order can no longer be extended
   * (`canAddItems: false`). It erases the stored order so the next action places
   * a genuinely new order instead of silently extending a closed one, which the
   * backend would reject with a 409.
   */
  startNewOrder: () => void;
  /** Locally records a newly created order so the next refresh finds it. */
  registerOrder: (snapshot: {
    orderId: string;
    tableNumber: number;
    currency: string;
    statusId: number;
    /** Stable machine code when known, so the icon is right on first paint. */
    statusCode?: string;
    statusName: string;
    statusColor: string;
  }) => void;
}

const SessionOrderContext = createContext<SessionOrderValue | null>(null);

export function SessionOrderProvider({ children }: { children: React.ReactNode }) {
  const { retry: retryTenant } = useTenant();
  const stored = useRef(loadActiveOrder());

  const [orderId, setOrderId] = useState<string | null>(() => stored.current?.orderId ?? null);
  const [tracking, setTracking] = useState<OrderTrackingView | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => stored.current !== null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOrderGone, setIsOrderGone] = useState(false);
  const [sessionError, setSessionError] = useState<Error | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<StatusUpdate | null>(null);

  /**
   * Overlapping polls are collapsed onto the request already in flight: a slow
   * response must not overwrite a newer one, and a manual refresh should not
   * queue behind a timer tick.
   */
  const inFlight = useRef(false);

  /**
   * Monotonic request counter. A response is applied only if its sequence is
   * still the newest, so a late reply from an aborted or superseded request can
   * never resurrect an older status.
   */
  const seq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  /** Last applied view, for diffing. Kept out of state to avoid a stale closure. */
  const applied = useRef<OrderTrackingView | null>(null);
  /** Consecutive failures, indexing {@link ERROR_BACKOFF_MS}. */
  const failures = useRef(0);

  // Cancel whatever is in flight when the provider goes away, so no request
  // outlives the screen that asked for it.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // 404 ORDER_NOT_FOUND means the order is really gone (deleted, or belonging to
  // a different session). That is the ONLY condition that clears the stored id —
  // a final status keeps it, because the customer still needs the tracking page,
  // and a session failure keeps it too, because the order is still theirs.
  const forgetOrder = useCallback(() => {
    clearActiveOrder();
    applied.current = null;
    // A new session must not inherit the previous order's error backoff.
    failures.current = 0;
    setOrderId(null);
    setTracking(null);
    setIsLoading(false);
    setError(null);
    setStatusUpdate(null);
  }, []);

  const load = useCallback(
    async (id: string, blocking: boolean): Promise<void> => {
      if (inFlight.current) return;
      inFlight.current = true;

      const ticket = ++seq.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (blocking) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const raw = await getOrderTracking(id, controller.signal);
        // A newer request has taken over; this reply is already irrelevant.
        if (ticket !== seq.current) return;

        const previous = applied.current;
        const next = mapOrderTracking(raw, previous);
        if (!next) {
          // A payload we cannot read is NOT proof the order is gone. Treating it
          // as "gone" would destroy a live order because a proxy returned an
          // error page, or the body was empty — only 404 ORDER_NOT_FOUND may
          // clear the stored id, so this is a retryable failure instead.
          failures.current += 1;
          if (!applied.current) {
            setError('The order response could not be read.');
          }
          return;
        }

        const change = compareTracking(previous, next);
        const view = change.changed ? markJustCompleted(next, change.newlyCompletedIds) : next;
        applied.current = view;
        setTracking(view);
        setError(null);
        setIsOrderGone(false);
        failures.current = 0;

        // Keep the persisted snapshot in step so the home bar can paint before
        // the first refresh of a freshly opened tab resolves.
        saveActiveOrder({
          orderId: view.orderId || id,
          tableNumber: view.tableNumber,
          currency: (view.currencyCode ?? stored.current?.currency ?? 'MAD') as CurrencyCode,
          statusId: view.currentStatus.id,
          statusCode: view.currentStatus.code,
          statusName: view.currentStatus.name,
          statusColor: view.currentStatus.color,
          // The snapshot stores an epoch stamp; a missing or unparseable
          // created-at falls back to now rather than becoming NaN.
          createdAt: toEpochMs(view.createdAt),
        });

        if (change.changed && change.statusName) {
          setStatusUpdate({
            statusName: change.statusName,
            color: change.color ?? view.currentStatus.color,
            at: Date.now(),
          });
        }
      } catch (err) {
        if (isAbortError(err) || ticket !== seq.current) return;

        // Two unrelated problems share this endpoint's status codes; the
        // classifier is the only thing that tells them apart.
        const kind = classifyTrackingError(err);
        if (kind === 'not_found') {
          setIsOrderGone(true);
          forgetOrder();
          return;
        }
        if (kind === 'session') {
          // Not this order's problem: hand it to the global re-mint flow and
          // leave the stored id alone, so recovery can still find the order.
          const sessionError =
            err instanceof ApiError ? new SessionExpiredError(err.status, err.message) : err;
          setSessionError(sessionError instanceof Error ? sessionError : new Error(String(err)));
          return;
        }

        failures.current += 1;
        // Keep the last known state on a transient failure so the screen does not
        // blank out mid-meal; only surface the error when we have nothing.
        if (!applied.current) {
          setError(err instanceof Error ? err.message : 'Failed to load your order.');
        }
      } finally {
        if (ticket === seq.current) {
          inFlight.current = false;
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [forgetOrder],
  );

  // Initial load, and recovery of a stored id after a page refresh.
  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      setTracking(null);
      return;
    }
    void load(orderId, true);
  }, [orderId, load]);

  // A rejected session is re-minted once and the whole tree re-requests, so this
  // only has to claim the shared budget and ask the tenant to re-bootstrap.
  // `beginSessionRecovery` is a no-op once another component has claimed it.
  useEffect(() => {
    if (!sessionError) return;
    if (beginSessionRecovery()) retryTenant();
  }, [sessionError, retryTenant]);

  const isFinal = tracking?.isFinal ?? false;

  /**
   * Poll while the tab is visible and the order is still in progress.
   *
   * Both guards matter: a hidden tab polling is wasted battery, and a final
   * status will never change again. Failures back off so a kitchen-side outage
   * does not turn into a request every ten seconds.
   */
  useEffect(() => {
    if (!orderId || isFinal) return;

    let timer: number;

    const schedule = (delay: number) => {
      timer = window.setTimeout(async () => {
        // A background tab is skipped, and the next tick is re-armed so the
        // cadence resumes when the customer comes back.
        if (document.visibilityState === 'visible') await load(orderId, false);
        const nextDelay =
          failures.current > 0
            ? ERROR_BACKOFF_MS[Math.min(failures.current, ERROR_BACKOFF_MS.length) - 1]
            : POLL_INTERVAL_MS;
        schedule(nextDelay);
      }, delay);
    };

    schedule(POLL_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [orderId, isFinal, load]);

  /**
   * A tab, window or connection restored from the background is usually stale,
   * so refresh at once instead of waiting out the remainder of the interval.
   */
  useEffect(() => {
    if (!orderId || isFinal) return;

    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void load(orderId, false);
    };

    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    window.addEventListener('online', refreshIfVisible);

    return () => {
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
      window.removeEventListener('online', refreshIfVisible);
    };
  }, [orderId, isFinal, load]);

  /**
   * One last refresh once the order reports itself final, then polling stops.
   *
   * The final transition often arrives with the closing step's timestamp only on
   * the following read, so a single confirming fetch keeps the timeline and the
   * totals consistent with the server.
   */
  const finalPollDone = useRef(false);
  useEffect(() => {
    if (!orderId) {
      finalPollDone.current = false;
      return;
    }
    if (!isFinal || finalPollDone.current) return;
    finalPollDone.current = true;
    void load(orderId, false);
  }, [orderId, isFinal, load]);

  const registerOrder = useCallback<SessionOrderValue['registerOrder']>((snapshot) => {
    saveActiveOrder({
      orderId: snapshot.orderId,
      tableNumber: snapshot.tableNumber,
      currency: snapshot.currency as CurrencyCode,
      statusId: snapshot.statusId,
      // The tracking DTO carries no stable code, so this is often empty and the
      // icon stays neutral until the first refresh resolves one.
      statusCode: snapshot.statusCode ?? '',
      statusName: snapshot.statusName,
      statusColor: snapshot.statusColor,
      createdAt: Date.now(),
    });
    // A new order invalidates the previous view: nothing may be "newly completed"
    // relative to the order the customer just placed.
    applied.current = null;
    failures.current = 0;
    setIsOrderGone(false);
    setError(null);
    setOrderId(snapshot.orderId);
  }, []);

  const refetch = useCallback(async () => {
    if (!orderId) return;
    await load(orderId, true);
  }, [orderId, load]);

  /**
   * Quiet refresh used after a successful add.
   *
   * Runs exactly once — the interval keeps its own schedule — so the customer
   * sees the extended order without the extra request rate.
   */
  const refreshInBackground = useCallback(async () => {
    if (!orderId) return;
    await load(orderId, false);
  }, [orderId, load]);

  const dismissStatusUpdate = useCallback(() => setStatusUpdate(null), []);

  const value = useMemo<SessionOrderValue>(
    () => ({
      orderId,
      hasOrder: orderId !== null,
      tracking,
      isLoading,
      isRefreshing,
      error,
      isOrderGone,
      sessionError,
      refetch,
      refreshInBackground,
      isFinal,
      // The server owns this rule; nothing here infers it from a status id.
      canAddItems: orderId !== null && (tracking?.canAddItems ?? true),
      statusUpdate,
      dismissStatusUpdate,
      startNewOrder: forgetOrder,
      registerOrder,
    }),
    [
      orderId,
      tracking,
      isLoading,
      isRefreshing,
      error,
      isOrderGone,
      sessionError,
      refetch,
      refreshInBackground,
      isFinal,
      statusUpdate,
      dismissStatusUpdate,
      forgetOrder,
      registerOrder,
    ],
  );

  return <SessionOrderContext.Provider value={value}>{children}</SessionOrderContext.Provider>;
}

/**
 * Single source of truth for "does this session have an order, and what is it".
 *
 * The UI consumes only `{ tracking, isLoading, isRefreshing, error, refetch }`,
 * so swapping the 10s poll for SignalR or SSE later is a change to this file
 * alone.
 */
export function useSessionOrder(): SessionOrderValue {
  const ctx = useContext(SessionOrderContext);
  if (!ctx) throw new Error('useSessionOrder must be used within SessionOrderProvider');
  return ctx;
}
