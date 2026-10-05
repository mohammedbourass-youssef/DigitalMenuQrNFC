export interface OrderLineDto {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderSummaryDto {
  orderId: string;
  orderNumber: number;
  tableNumber: number;
  totalPrice: number;
  lines: OrderLineDto[];
}

export interface OrderStatusColumnDto {
  statusId: number;
  statusName: string;
  /** Hex colour coming from the backend, e.g. "#3B82F6". */
  statusColor: string;
  /** Real count for the status. Never derive this from `orders.length`. */
  totalOrders: number;
  isSystem: boolean;
  orders: OrderSummaryDto[];
}

export type CurrentOrdersResponse = OrderStatusColumnDto[];

/* ------------------------------------------------------------------ *
 * OrderLiveChanges hub payloads
 *
 * SignalR serializes camelCase and sends Guids as strings, which makes the hub
 * payloads structurally identical to the REST DTOs above. They are aliased
 * rather than duplicated so the board keeps a single order type.
 * ------------------------------------------------------------------ */

/** `OrderLineItem` on the `NewOrderReceived` event. */
export type OrderLineItemPayload = OrderLineDto;

/**
 * `OrderSummaryStatus` on the `NewOrderReceived` event. It carries no status:
 * a freshly created order always belongs to the first status column.
 */
export type OrderSummaryStatusPayload = OrderSummaryDto;