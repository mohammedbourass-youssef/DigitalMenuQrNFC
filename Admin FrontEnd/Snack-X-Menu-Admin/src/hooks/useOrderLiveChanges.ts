import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

import { resolveHubUrl } from "@/lib/apiHubUrl";
import type { OrderSummaryDto, OrderSummaryStatusPayload } from "@/types/orders";

/**
 * Live order tracking for the Orders board, backed by the `OrderLiveChanges`
 * hub.
 *
 * The connection is deliberately NOT global: one connection is built per mount
 * and torn down on unmount, so leaving the page really closes the socket. That
 * is why this hook belongs to the Orders page and to nothing else.
 */

/** Mapped at the app root, next to (not under) `/api`. */
const HUB_PATH = "/hubs/order-live-changes";

/** Same storage key `getAuthHeaders()` reads in `@/lib/axios`. */
const TOKEN_STORAGE_KEY = "token";

const NEW_ORDER_EVENT = "NewOrderReceived";
const SUBSCRIBE_METHOD = "SubscribeToOrderTracking";
const UNSUBSCRIBE_METHOD = "UnsubscribeFromOrderTracking";

export type OrderLiveState = "connecting" | "connected" | "reconnecting" | "disconnected";

export interface UseOrderLiveChangesOptions {
  /**
   * Called after every successful (re)subscribe, so the caller can recover the
   * orders the hub did not replay while the socket was down.
   */
  onReconnected?: () => void;
  /**
   * Receives a promise that resolves once the subscription settles. The REST
   * fetch waits on it so no order can slip in between the two.
   */
  subscriptionGate?: MutableRefObject<Promise<void> | null>;
}

export interface UseOrderLiveChangesResult {
  state: OrderLiveState;
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** One gate per mount: resolved when the first subscription settles. */
function createGate(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

export function useOrderLiveChanges(
  onNewOrder: (order: OrderSummaryDto) => void,
  options: UseOrderLiveChangesOptions = {}
): UseOrderLiveChangesResult {
  const [state, setState] = useState<OrderLiveState>("connecting");

  // Read through refs: the effect below must run once per mount, so it can never
  // depend on a callback identity the page re-creates on every render.
  const onNewOrderRef = useRef(onNewOrder);
  const onReconnectedRef = useRef(options.onReconnected);
  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
    onReconnectedRef.current = options.onReconnected;
  });

  const gateRef = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);
  if (gateRef.current === null) gateRef.current = createGate();

  // Empty dependency list on purpose: one connection per mount, like the spec.
  useEffect(() => {
    const gate = gateRef.current!;
    const { subscriptionGate } = options;

    // Published synchronously so the caller's fetch effect (registered after
    // this one) can await it on its very first run.
    if (subscriptionGate) subscriptionGate.current = gate.promise;

    // Guards every async continuation: StrictMode unmounts, navigations and
    // manual stops all set this before anything can resolve.
    let disposed = false;

    const connection = new HubConnectionBuilder()
      .withUrl(resolveHubUrl(HUB_PATH), {
        // WebSockets cannot send an Authorization header.
        accessTokenFactory: () => readToken() ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    const handleNewOrder = (payload: OrderSummaryStatusPayload) => {
      if (disposed) return;
      onNewOrderRef.current(payload);
    };

    connection.on(NEW_ORDER_EVENT, handleNewOrder);

    connection.onreconnecting(() => {
      if (!disposed) setState("reconnecting");
    });

    connection.onreconnected(async () => {
      // Group membership is tied to the connection id, so it must be restored.
      try {
        await connection.invoke(SUBSCRIBE_METHOD);
        if (disposed) return;
        setState("connected");
        // Nothing was replayed while we were away: refetch once.
        onReconnectedRef.current?.();
      } catch (error) {
        console.error("[orders.live] could not resubscribe after reconnecting", error);
      }
    });

    connection.onclose(() => {
      if (!disposed) setState("disconnected");
    });

    void (async () => {
      try {
        await connection.start();
        // Unmounted (or stopped) while the handshake was in flight.
        if (disposed) return;
        await connection.invoke(SUBSCRIBE_METHOD);
        if (disposed) return;
        setState("connected");
      } catch (error) {
        // The board must keep working even when the hub is unreachable.
        console.error("[orders.live] could not start order tracking", error);
        if (!disposed) setState("disconnected");
      } finally {
        // Never leave the REST fetch waiting on a hub that never came up.
        gate.resolve();
      }
    })();

    return () => {
      disposed = true;
      gate.resolve();
      connection.off(NEW_ORDER_EVENT, handleNewOrder);
      void (async () => {
        try {
          if (connection.state !== HubConnectionState.Disconnected) {
            await connection.invoke(UNSUBSCRIBE_METHOD);
          }
        } catch {
          // Already gone; stopping is what matters.
        }
        try {
          await connection.stop();
        } catch (error) {
          console.error("[orders.live] could not stop order tracking", error);
        }
      })();
    };
  }, []);

  return { state };
}
