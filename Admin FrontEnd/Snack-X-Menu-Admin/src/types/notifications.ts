/**
 * Shapes of the `ReceiveNotification` event sent by the ASP.NET Core
 * `NotificationHub`.
 *
 * The hub currently only fills `message`, `orderId` and `createdAt`, so the
 * other documented fields are optional: a missing `type` simply means the UI
 * falls back to the server text instead of a translation key.
 */

/** Known notification kinds. `(string & {})` keeps unknown future kinds usable. */
export type NotificationType =
  | 'OrderCreated'
  | 'OrderStatusChanged'
  | 'PaymentReceived'
  | 'OrderShipped'
  | (string & {});

/** Raw payload as it arrives on the wire (camelCase, per SignalR's JSON protocol). */
export interface NotificationDto {
  id?: number;
  type?: NotificationType;
  title?: string;
  message: string;
  orderId: number | null;
  /** ISO 8601 UTC timestamp. */
  createdAt: string;
}

/** A notification kept in the client store, with its text already resolved. */
export interface AppNotification {
  /** Stable key: the server id when present, otherwise a locally generated one. */
  key: string;
  type?: NotificationType;
  /** Localized when a translation exists, otherwise the server text. */
  title: string;
  /** Localized when a translation exists, otherwise the server text. */
  message: string;
  orderId: number | null;
  createdAt: string;
}

export type NotificationConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';
