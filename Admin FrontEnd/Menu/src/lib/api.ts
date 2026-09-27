import type { CreateOrderPayload, OrderResult, TableInfo } from '../types';
import { TENANT } from './tenant';
import { getSessionId } from './session';
import { ApiError, InvalidTableError, NetworkError, TenantNotFoundError } from './errors';
import { mockCreateOrder, mockGetTable } from './mock';

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
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  const isGet = method === 'GET';

  const attempt = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (TENANT) headers['X-Tenant'] = TENANT;
    // Required by every [NeedSession] endpoint. Absent until /api/tenant/info
    // has minted a session, which is why it is attached opportunistically.
    const sessionId = getSessionId();
    if (sessionId) headers['X-Session-Id'] = sessionId;
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    try {
      return await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timer);
    }
  };

  let response: Response;
  try {
    response = await attempt();
  } catch {
    if (opts.retry !== false && isGet) {
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

export function createOrder(payload: CreateOrderPayload): Promise<OrderResult> {
  if (USE_MOCK) return mockCreateOrder(payload);
  return request<OrderResult>('/api/tenant/orders', { method: 'POST', body: payload, retry: false });
}

export function isMockMode(): boolean {
  return USE_MOCK;
}