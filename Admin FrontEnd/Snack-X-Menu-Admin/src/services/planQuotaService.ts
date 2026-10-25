import axiosInstance, { getAuthHeaders } from '@/lib/axios';
import type { PlanQuota } from '@/types/planQuota';

export async function getPlanQuota(signal?: AbortSignal): Promise<PlanQuota> {
  const { data } = await axiosInstance.get<PlanQuota>('/Plans/Quota', {
    headers: getAuthHeaders(),
    signal,
  });
  return data;
}
