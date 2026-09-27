import { apiFetch, isMockMode } from '../lib/api';
import { ApiError, TenantNotFoundError } from '../lib/errors';
import { mockGetTenantInfo } from '../lib/mock';
import type { TenantInfoResponse } from '../types/tenant';

/**
 * Fetches the tenant info + starts a session for the current restaurant.
 * 404s (expired/unknown tenant) surface as TenantNotFoundError.
 */
export async function fetchTenantInfo(): Promise<TenantInfoResponse> {
  if (isMockMode()) return mockGetTenantInfo();
  try {
    // The backend serialises with camelCase (ASP.NET Core MVC default),
    // matching TenantInfoResponse's field names exactly — no mapping needed.
    const info = await apiFetch<TenantInfoResponse>('/api/tenant/info');
    return info;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new TenantNotFoundError();
    }
    throw error;
  }
}