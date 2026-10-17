import { useQuery } from '@tanstack/react-query';
import type { AdminHistoryFilters, AdminOrdersHistoryDTO, PagedResult } from '@/types/orderHistory';
import { getOrderHistory } from '@/services/orderHistoryService';

export function useOrderHistory(filters: AdminHistoryFilters, enabled: boolean = true) {
  const query = useQuery<PagedResult<AdminOrdersHistoryDTO>>({
    queryKey: ['orderHistory', filters],
    queryFn: ({ signal }) => getOrderHistory(filters, signal),
    enabled,
    staleTime: 60000,
    placeholderData: (previousData) => previousData,
  });

  return {
    ...query,
    items: query.data?.items ?? [],
    page: query.data?.page ?? filters.PageNumber,
    pageSize: query.data?.pageSize ?? filters.PageCunt,
    totalCount: query.data?.totalCount ?? 0,
    totalOrdersInTenant: query.data?.totalOrdersInTenant ?? 0,
    totalPages: query.data?.totalPages ?? 0,
    hasNextPage: query.data?.hasNextPage ?? false,
    hasPreviousPage: query.data?.hasPreviousPage ?? false,
  };
}
