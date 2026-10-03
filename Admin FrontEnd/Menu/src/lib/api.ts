import type { TableInfo } from '../types';
import { TENANT } from './tenant';
import { getSessionId } from './session';
import { getActiveLangCode } from './lang';
import { ApiError, AbortError, InvalidTableError, NetworkError, TenantNotFoundError } from './errors';
import { mockGetTable } from './mock';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error(
    'VITE_API_URL is not set. Copy .env.example to .env.development and set it.'
  );
}

const API_BASE = API_BASE_URL.replace(/\/+$/, '');

const TIMEOUT_MS = 10_000;

const NETWORK_ERROR_MESSAGE = `Could not reach the API at ${API_BASE_URL}. If this is a local HTTPS backend, make sure you have accepted its certificate by opening ${API_BASE_URL} directly in the browser once.`;

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  retry?: boolean;
  /**
   * `RequestCache`. Set to `no-store` for polling endpoints so a stale
   * intermediate or disk-cache entry can never satisfy a refresh.
   */
  cache?: RequestCache;
  /**
   * Caller-owned abort signal. The wrapper composes it with its own timeout
   * controller, so a component can cancel an in-flight request (for example
   * when the order id changes) without the request outliving its consumer.
   */
  signal?: AbortSignal;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  const isGet = method === 'GET';

  const attempt = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    // Forward the caller's cancellation into this attempt's controller.
    const onExternalAbort = () => controller.abort();
    opts.signal?.addEventListener('abort', onExternalAbort, { once: true });
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (TENANT) headers['X-Tenant'] = TENANT;
    // Required by every [NeedSession] endpoint, attached opportunistically
    // because it only exists once /api/tenant/info has bootstrapped. /info
    // itself is anonymous, so the middleware never inspects it there.
    const sessionId = getSessionId();
    if (sessionId) headers['X-Session-Id'] = sessionId;
    // Language for server-side translation of every response. Read here — at
    // request time — rather than cached at module load, so switching language
    // takes effect on the very next request with no reload.
    headers['X-Lang'] = getActiveLangCode();
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    try {
      return await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
        cache: opts.cache,
      });
    } finally {
      window.clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onExternalAbort);
    }
  };

  let response: Response;
  try {
    response = await attempt();
  } catch {
    // A caller-initiated abort is not a failure to report or to retry.
    if (opts.signal?.aborted) throw new AbortError();    if (opts.retry !== false && isGet) {
      try {
        response = await attempt();
      } catch {
        throw new NetworkError(NETWORK_ERROR_MESSAGE);
      }
    } else {
      throw new NetworkError(NETWORK_ERROR_MESSAGE);
    }
  }

  if (!response.ok) {
    if (response.status === 404 && path.startsWith('/api/tenant/info')) {
      throw new TenantNotFoundError();
    }
    if (response.status === 404 && path.startsWith('/api/tenant/tables/')) {
      throw new InvalidTableError();
    }
    // The backend returns `{ "error": "..." }`; older shapes used `message`.
    const data = (await response.json().catch(() => null)) as
      | { error?: string; message?: string; code?: string }
      | null;
    throw new ApiError(
      response.status,
      data?.error ?? data?.message ?? `Request failed (${response.status})`,
      data?.code,
    );
  }

  // 204 No Content carries no body — there is nothing to parse.
  if (response.status === 204) return null as T;

  return (await response.json()) as T;
}

/** Generic fetch through the shared wrapper (timeout, retry, X-Tenant). */
export function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  return request<T>(path, opts);
}

export function getTableByToken(token: string): Promise<TableInfo> {
  if (USE_MOCK) return mockGetTable(token);
  return request<TableInfo>(`/api/tenant/tables/${encodeURIComponent(token)}`);
}

// Order creation lives in `services/orderService.ts`: it posts to
// `/api/tenant/Order` (singular) with the backend's `OrderRequestDTO` shape,
// which no longer matches the `CreateOrderPayload` this module used to send.

export function isMockMode(): boolean {
  return USE_MOCK;
}