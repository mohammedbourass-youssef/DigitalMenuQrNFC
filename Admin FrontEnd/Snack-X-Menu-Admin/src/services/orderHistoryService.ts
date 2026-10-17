import axiosInstance, { getAuthHeaders } from '@/lib/axios';
import type { AdminHistoryFilters, AdminOrdersHistoryDTO } from '@/types/orderHistory';

export async function getOrderHistory(filters: AdminHistoryFilters, signal?: AbortSignal): Promise<AdminOrdersHistoryDTO[]> {
  const response = await axiosInstance.get<AdminOrdersHistoryDTO[]>('/Orders/order-history', {
    params: filters,
    signal,
    headers: getAuthHeaders(),
  });
  return response.data;
}
