import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

import { resolveHubUrl } from '@/lib/apiHubUrl';
import type {
  NotificationConnectionState,
  NotificationDto,
} from '@/types/notifications';

/**
 * Single SignalR connection for the whole app.
 *
 * Lives outside React on purpose: StrictMode mounts effects twice in dev, and a
 * provider-scoped connection would then open two sockets and deliver every
 * notification twice. `start()`/`stop()` are idempotent and `on(...)` is
 * registered exactly once, on the one connection instance that is reused for
 * the lifetime of the page.
 */

/** `NotificationHub` is mapped at the app root, next to (not under) `/api`. */
const HUB_PATH = '/hubs/notifications';

/** Same key `getAuthHeaders()` reads in `@/lib/axios`. */
const TOKEN_STORAGE_KEY = 'token';

const SUBSCRIBE_METHOD = 'SubscribeToOrders';
const UNSUBSCRIBE_METHOD = 'UnsubscribeFromOrders';
const RECEIVE_EVENT = 'ReceiveNotification';

type NotificationHandler = (payload: NotificationDto) => void;
type StateHandler = (state: NotificationConnectionState) => void;

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function mapState(state: HubConnectionState): NotificationConnectionState {
  switch (state) {
    case HubConnectionState.Connecting:
      return 'connecting';
    case HubConnectionState.Connected:
      return 'connected';
    case HubConnectionState.Reconnecting:
      return 'reconnecting';
    default:
      return 'disconnected';
  }
}

class NotificationsHubService {
  private connection: HubConnection | null = null;
  private notificationHandlers = new Set<NotificationHandler>();
  private stateHandlers = new Set<StateHandler>();
  private state: NotificationConnectionState = 'disconnected';
  /** De-duplicates concurrent `start()` calls (React StrictMode, fast login). */
  private startPromise: Promise<void> | null = null;

  getState(): NotificationConnectionState {
    return this.state;
  }

  subscribeNotifications(handler: NotificationHandler): () => void {
    this.notificationHandlers.add(handler);
    return () => {
      this.notificationHandlers.delete(handler);
    };
  }

  subscribeState(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  private setState(next: NotificationConnectionState): void {
    if (this.state === next) return;
    this.state = next;
    this.stateHandlers.forEach((handler) => {
      try {
        handler(next);
      } catch (error) {
        console.error('[notifications] state listener failed', error);
      }
    });
  }

  /** Built once and reused: `on(...)` must never be registered twice. */
  private getConnection(): HubConnection {
    if (this.connection) return this.connection;

    const connection = new HubConnectionBuilder()
      .withUrl(resolveHubUrl(HUB_PATH), {
        // WebSockets cannot carry an Authorization header, so the JWT goes here.
        accessTokenFactory: () => readToken() ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on(RECEIVE_EVENT, (payload: NotificationDto) => {
      this.notificationHandlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error('[notifications] handler failed', error);
        }
      });
    });

    connection.onreconnecting((error) => {
      console.error('[notifications] reconnecting', error);
      this.setState('reconnecting');
    });

    connection.onreconnected(async () => {
      // Group membership does not survive a reconnect, so subscribe again.
      try {
        await connection.invoke(SUBSCRIBE_METHOD);
        this.setState('connected');
      } catch (error) {
        console.error('[notifications] could not resubscribe after reconnect', error);
      }
    });

    connection.onclose((error) => {
      if (error) console.error('[notifications] connection closed', error);
      this.setState('disconnected');
    });

    this.connection = connection;
    return connection;
  }

  /** Starts the connection and joins the orders group. Safe to call twice. */
  async start(): Promise<void> {
    if (this.startPromise) return this.startPromise;

    const connection = this.getConnection();
    if (connection.state === HubConnectionState.Connected) {
      this.setState('connected');
      return;
    }

    this.setState('connecting');

    this.startPromise = (async () => {
      try {
        await connection.start();
        await connection.invoke(SUBSCRIBE_METHOD);
        this.setState('connected');
      } catch (error) {
        // A hub that cannot be reached must never break the admin UI.
        console.error('[notifications] could not start the hub connection', error);
        this.setState('disconnected');
      } finally {
        this.startPromise = null;
      }
    })();

    return this.startPromise;
  }

  /** Leaves the group and closes the socket. Safe to call when not started. */
  async stop(): Promise<void> {
    const connection = this.connection;
    if (!connection) {
      this.setState('disconnected');
      return;
    }

    // Let a start that is still in flight settle, otherwise `stop()` races it.
    if (this.startPromise) {
      await this.startPromise.catch(() => undefined);
    }

    if (connection.state !== HubConnectionState.Disconnected) {
      try {
        await connection.invoke(UNSUBSCRIBE_METHOD);
      } catch {
        // Already gone; stopping is what matters.
      }
      try {
        await connection.stop();
      } catch (error) {
        console.error('[notifications] could not stop the hub connection', error);
      }
    }

    this.setState('disconnected');
  }
}

export const notificationsHub = new NotificationsHubService();
