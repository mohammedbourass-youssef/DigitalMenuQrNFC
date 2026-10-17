export interface AdminOrdersHistoryDTO {
  orderId: string;
  tableId: string | null;
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

export interface AdminHistoryFilters {
  OrderNumber?: number;
  FromUTC?: string;
  ToUTC?: string;
  PageCunt: number;
  PageNumber: number;
  OrderStatus?: number;
  paymentStatus?: number;
}
