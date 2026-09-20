import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getAdminMenus } from "@/services/menuService";
import type { AdminMenusParams } from "@/types/menuItem";

export function useAdminMenuItems(params: AdminMenusParams, enabled = true) {
  return useQuery({
    queryKey: [
      "admin-menus",
      params.currencyCode,
      params.language,
      params.page ?? 1,
      params.pageSize ?? 20,
    ],
    queryFn: () => getAdminMenus(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: 1,
    enabled,
  });
}