import axiosInstance, { getAuthHeaders } from '@/lib/axios';
import type { AdminHistoryFilters, AdminOrdersHistoryDTO, PagedResult } from '@/types/orderHistory';

export async function getOrderHistory(filters: AdminHistoryFilters, signal?: AbortSignal): Promise<PagedResult<AdminOrdersHistoryDTO>> {
  const response = await axiosInstance.get<PagedResult<AdminOrdersHistoryDTO>>('/Orders/order-history', {
    params: filters,
    signal,
    headers: getAuthHeaders(),
  });
  return response.data;
}
