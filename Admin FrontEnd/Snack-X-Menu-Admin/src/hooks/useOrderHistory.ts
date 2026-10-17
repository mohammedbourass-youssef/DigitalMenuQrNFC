import { useQuery } from '@tanstack/react-query';
import type { AdminHistoryFilters, AdminOrdersHistoryDTO } from '@/types/orderHistory';
import { getOrderHistory } from '@/services/orderHistoryService';

export function useOrderHistory(filters: AdminHistoryFilters, enabled: boolean = true) {
  return useQuery<AdminOrdersHistoryDTO[]>({
    queryKey: ['orderHistory', filters],
    queryFn: ({ signal }) => getOrderHistory(filters, signal),
    enabled,
    staleTime: 60000,
  });
}
