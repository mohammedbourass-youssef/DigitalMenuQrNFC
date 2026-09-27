import { tenantScopedKey } from './tenant';

const SESSION_PREFIX = 'session';

export function saveSessionId(sessionId: string): void {
  try {
    window.localStorage.setItem(tenantScopedKey(SESSION_PREFIX), sessionId);
  } catch {
    // Storage unavailable — ignore silently.
  }
}

export function getSessionId(): string | null {
  try {
    return window.localStorage.getItem(tenantScopedKey(SESSION_PREFIX));
  } catch {
    return null;
  }
}

export function clearSessionId(): void {
  try {
    window.localStorage.removeItem(tenantScopedKey(SESSION_PREFIX));
  } catch {
    // Storage unavailable — ignore silently.
  }
}

/**
 * Whether a session token has been stored yet.
 *
 * This is the single source of truth for "may a [NeedSession] request be sent?",
 * and it deliberately reads storage rather than React state: the request
 * pipeline in `lib/api.ts` attaches whatever `getSessionId()` returns, so that
 * is the exact value a request would carry.
 */
export function hasSessionId(): boolean {
  return getSessionId() !== null;
}