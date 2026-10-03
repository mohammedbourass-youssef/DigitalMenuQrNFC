import { TENANT, tenantScopedKey } from './tenant';

const SESSION_PREFIX = 'session';

/**
 * In-memory mirror of the session token.
 *
 * localStorage throws in private mode and when storage is blocked by policy.
 * Without a mirror the token would be dropped on every such page load, every
 * [NeedSession] request would go out unauthenticated, and the app would
 * recover by minting a fresh session each time. The mirror keeps the current
 * token usable for the life of the page even when persistence fails.
 */
let memorySessionId: string | null = null;

/**
 * Storage key for the session token, scoped to the restaurant.
 *
 * `tenantScopedKey` covers the resolved slug. When no slug could be resolved
 * (unusual host, or a dev build with no `?tenant=`), it degrades to an
 * unscoped key, which would let two restaurants on different hosts share one
 * token — and a token from restaurant A is rejected by restaurant B. Falling
 * back to the hostname keeps the scope per-restaurant either way.
 */
function sessionKey(): string {
  if (TENANT) return tenantScopedKey(SESSION_PREFIX);
  const host = typeof window === 'undefined' ? '' : window.location.hostname;
  return host ? `${SESSION_PREFIX}:${host}` : SESSION_PREFIX;
}

export function saveSessionId(sessionId: string): void {
  // The mirror is written first and unconditionally: it is the fallback that
  // must not depend on storage succeeding.
  memorySessionId = sessionId;
  try {
    window.localStorage.setItem(sessionKey(), sessionId);
  } catch {
    // Storage unavailable — the in-memory token still serves this page load.
  }
}

/**
 * The token later requests should carry.
 *
 * Storage is preferred so the session survives a reload, with the in-memory
 * mirror as the fallback. Returns null only when neither has a token, which is
 * the app's signal that `/info` has not bootstrapped yet.
 */
export function getSessionId(): string | null {
  try {
    const stored = window.localStorage.getItem(sessionKey());
    if (stored) return stored;
  } catch {
    // Storage unavailable — fall through to the mirror.
  }
  return memorySessionId;
}

export function clearSessionId(): void {
  memorySessionId = null;
  try {
    window.localStorage.removeItem(sessionKey());
  } catch {
    // Storage unavailable — nothing persisted to remove.
  }
}

/**
 * Whether a session token is available.
 *
 * This is the single source of truth for "may a [NeedSession] request be sent?",
 * and it deliberately reads through `getSessionId()` rather than React state:
 * the request pipeline in `lib/api.ts` attaches whatever that returns, so this
 * is the exact value a request would carry.
 */
export function hasSessionId(): boolean {
  return getSessionId() !== null;
}