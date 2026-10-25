import axios from 'axios';
import type { QueryClient } from '@tanstack/react-query';

import { PLAN_QUOTA_QUERY_KEY } from '@/hooks/usePlanQuota';

export interface CategoryApiErrorBody {
  code?: string;
  message?: string;
  current?: number;
  limit?: number;
}

export function getCategoryApiError(error: unknown): CategoryApiErrorBody | undefined {
  if (!axios.isAxiosError<CategoryApiErrorBody>(error)) return undefined;
  return error.response?.data;
}

export function refreshCategoryQuotaAndList(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: PLAN_QUOTA_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
}

export function categoryLimitReachedMessage(current?: number, limit?: number): string {
  const used = current ?? 0;
  const max = limit ?? 0;
  return `You reached your category limit (${used} / ${max}). Upgrade your plan.`;
}
