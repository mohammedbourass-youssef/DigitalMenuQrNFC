import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getPlanQuota } from '@/services/planQuotaService';

export const PLAN_QUOTA_QUERY_KEY = ['plan-quota'] as const;

export function usePlanQuota() {
  const { isAuthenticated, isLoading, user } = useAuth();
  return useQuery({
    queryKey: PLAN_QUOTA_QUERY_KEY,
    queryFn: ({ signal }) => getPlanQuota(signal),
    enabled: !isLoading && isAuthenticated && user?.role === 'TenantOwner',
    staleTime: 5 * 60 * 1000,
  });
}
