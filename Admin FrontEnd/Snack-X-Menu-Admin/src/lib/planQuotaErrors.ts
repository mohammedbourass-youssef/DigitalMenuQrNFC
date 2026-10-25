import axios from 'axios';
import { toast } from 'sonner';
import type { QueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import type { PlanQuota, PlanQuotaResource } from '@/types/planQuota';
import { PLAN_QUOTA_QUERY_KEY } from '@/hooks/usePlanQuota';
import { tablesQueryKey } from '@/hooks/useTables';

export interface PlanQuotaApiErrorBody {
  code?: string;
  message?: string;
  current?: number;
  limit?: number;
  attempted?: number;
}

const LIMIT_CODES: Record<PlanQuotaResource, string> = {
  categories: 'CATEGORY_LIMIT_REACHED',
  menuItems: 'MENUITEM_LIMIT_REACHED',
  tables: 'TABLE_LIMIT_REACHED',
  users: 'USER_LIMIT_REACHED',
};

export function getPlanQuotaApiError(error: unknown): PlanQuotaApiErrorBody | undefined {
  if (!axios.isAxiosError<PlanQuotaApiErrorBody>(error)) return undefined;
  const data = error.response?.data;
  return data && typeof data === 'object' ? data : undefined;
}

export function isPlanQuotaLimitError(error: unknown): boolean {
  const code = getPlanQuotaApiError(error)?.code;
  return code === LIMIT_CODES.categories
    || code === LIMIT_CODES.menuItems
    || code === LIMIT_CODES.tables
    || code === LIMIT_CODES.users;
}

export function handlePlanQuotaLimitError(
  error: unknown,
  resource: PlanQuotaResource,
  quota: PlanQuota | undefined,
  queryClient: QueryClient,
  t: TFunction
): boolean {
  const apiError = getPlanQuotaApiError(error);
  if (!apiError) return false;

  if (apiError.code === 'PLAN_NOT_FOUND' || apiError.code === 'TENANT_NOT_FOUND') {
    toast.error(t('planQuota.planNotFound', {
      defaultValue: 'Your plan could not be found. Contact support.',
    }));
    return true;
  }

  if (apiError.code !== LIMIT_CODES[resource]) return false;

  if (resource === 'tables') {
    const current = apiError.current ?? quota?.tables.used ?? 0;
    const limit = apiError.limit ?? quota?.tables.max ?? 0;
    toast.error(t('planQuota.tableLimitToast', {
      current,
      limit,
      defaultValue: `You reached your table limit (${current} / ${limit}). Upgrade your plan.`,
    }));
    void queryClient.invalidateQueries({ queryKey: PLAN_QUOTA_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: tablesQueryKey });
    return true;
  }

  if (resource === 'menuItems') {
    const current = apiError.current ?? quota?.menuItems.used ?? 0;
    const limit = apiError.limit ?? quota?.menuItems.max ?? 0;
    toast.error(t('planQuota.menuItemLimitToast', {
      current,
      limit,
      defaultValue: `You reached your menu item limit (${current} / ${limit}). Upgrade your plan.`,
    }));
    void queryClient.invalidateQueries({ queryKey: PLAN_QUOTA_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ['admin-menus'] });
    return true;
  }

  void queryClient.invalidateQueries({ queryKey: PLAN_QUOTA_QUERY_KEY });
  const display = quota?.[resource].display ?? '—';
  toast.error(t('planQuota.limitReached', {
    display,
    defaultValue: `You reached your limit (${display}). Upgrade your plan.`,
  }));
  return true;
}
