import { apiFetch, isMockMode } from '../lib/api';
import { ApiError, TenantNotFoundError } from '../lib/errors';
import { mockGetTenantInfo } from '../lib/mock';
import { getSessionId } from '../lib/session';
import type { TenantInfoResponse } from '../types/tenant';

/**
 * In-flight bootstrap, shared by every caller in this page load.
 *
 * `/info` mints a session whenever it is not handed a reusable one, so two
 * concurrent calls would create two sessions and the second would invalidate
 * the first. Callers that arrive while a request is running join it instead.
 *
 * Cleared as soon as the request settles, so a session-expiry recovery (which
 * must genuinely re-mint) is not blocked by an already-resolved promise.
 */
let inFlight: Promise<TenantInfoResponse> | null = null;

/**
 * Fetches the tenant info, starting or reusing a session for this restaurant.
 *
 * The stored token is passed as `?oldSession=` so the server can hand back the
 * same session when it is still valid. The param is omitted entirely when there
 * is nothing stored — sending `oldSession=` or `oldSession=null` would make the
 * server treat it as absent anyway, but the contract asks for it not to be sent.
 *
 * 404 (unknown restaurant) surfaces as TenantNotFoundError.
 */
async function requestTenantInfo(): Promise<TenantInfoResponse> {
  if (isMockMode()) return mockGetTenantInfo();

  // Read at call time rather than at module load: the token is written by the
  // bootstrap itself, so a later recovery must observe the value that failed.
  const oldSession = getSessionId();
  const path = oldSession
    ? `/api/tenant/info?oldSession=${encodeURIComponent(oldSession)}`
    : '/api/tenant/info';

  try {
    // The backend serialises with camelCase (ASP.NET Core MVC default),
    // matching TenantInfoResponse's field names exactly — no mapping needed.
    return await apiFetch<TenantInfoResponse>(path);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new TenantNotFoundError();
    }
    throw error;
  }
}

export function fetchTenantInfo(): Promise<TenantInfoResponse> {
  if (inFlight) return inFlight;
  const promise = requestTenantInfo();
  inFlight = promise;
  // Clearing on settle keeps the dedupe scoped to genuinely concurrent calls.
  void promise.catch(() => undefined).finally(() => {
    if (inFlight === promise) inFlight = null;
  });
  return promise;
}