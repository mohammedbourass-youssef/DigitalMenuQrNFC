import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getAdminCategories } from "@/services/categoryService";

export function useAdminCategories(lang: string, pageNumber: number, pageCount: number) {
  return useQuery({
    queryKey: ["admin-categories", lang, pageNumber, pageCount],
    queryFn: () => getAdminCategories(lang, pageNumber, pageCount),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}