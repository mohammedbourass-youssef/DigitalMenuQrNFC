export interface AdminOrdersHistoryDTO {
  orderId: string;
  /** Display table number; null for takeaway/delivery/counter orders. */
  tableId: number | null;
  orderNumber: number;
  orderStatus: string;
  paymentStatus: string;
  subtotal: number;
  total: number;
  paidAmount: number;
  paidAtUTC: string | null;
  notes: string | null;
  createdAtURC: string;
  totalItems: number;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalOrdersInTenant: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AdminHistoryFilters {
  OrderNumber?: number;
  FromUTC?: string;
  ToUTC?: string;
  PageCunt: number;
  PageNumber: number;
  OrderStatus?: number;
  paymentStatus?: number;
}
