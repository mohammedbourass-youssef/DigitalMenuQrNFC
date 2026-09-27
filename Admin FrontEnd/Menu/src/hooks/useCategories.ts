import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTenant } from '@/contexts/TenantContext';
import { SessionExpiredError } from '@/lib/errors';
import { hasSessionId } from '@/lib/session';
import {
  beginSessionRecovery,
  endSessionRecovery,
  resetSessionRecovery,
} from '@/lib/sessionRecovery';
import {
  ensureCategories,
  getCategoriesSnapshot,
  subscribeCategories,
} from '@/lib/categoriesStore';
import { buildAllCategory } from '@/data/allCategory';
import type { CategoriesSnapshot } from '@/types/category';

/**
 * True once the tenant has resolved *and* a session token is actually stored.
 *
 * `GET /api/tenant/Categories` is `[NeedSession]`, and the token is only
 * written when `/api/tenant/info` resolves. TenantContext happens to call
 * `saveSessionId` before flipping to 'ready', but relying on that ordering is
 * implicit — this states the dependency outright so no session-guarded fetch
 * can be scheduled in the gap.
 */
export function useSessionReady(): boolean {
  const { status } = useTenant();
  return status === 'ready' && hasSessionId();
}

/**
 * Categories for the active language, as a `useSyncExternalStore` subscription
 * to the shared store. The fetch is kicked off from an effect rather than
 * during render, and only once a session token exists.
 *
 * The frontend "All" tab is prepended to the API list, so the rail always has a
 * non-narrowing option. `status` and `error` still describe the API request
 * alone, which is what the session guard keys off.
 */
export function useCategories(): CategoriesSnapshot {
  const { lang } = useLanguage();
  const sessionReady = useSessionReady();

  const subscribe = useCallback((listener: () => void) => subscribeCategories(listener), []);
  const getSnapshot = useCallback(() => getCategoriesSnapshot(lang), [lang]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    if (!sessionReady) return;
    ensureCategories(lang);
  }, [lang, sessionReady]);

  return useMemo<CategoriesSnapshot>(
    () => ({ ...snapshot, categories: [buildAllCategory(lang), ...snapshot.categories] }),
    [snapshot, lang],
  );
}

/**
 * Watches for a `SessionExpiredError` from any session-guarded request and
 * recovers from it: clears the stale session, asks TenantContext to re-mint
 * one via GET /api/tenant/info, then re-runs the request against the new
 * session.
 *
 * The retry budget lives in `lib/sessionRecovery` (module-scoped) because
 * TenantProvider unmounts its children while re-fetching tenant info — a ref
 * here would be reset by the very recovery it is meant to bound, and the
 * retry would loop forever.
 *
 * Mount this once, near the root of the ready subtree.
 */
export function useSessionExpiryGuard(): void {
  const { tenant, status, retry } = useTenant();
  const { status: categoriesStatus, error } = useCategories();
  const sessionReady = useSessionReady();

  const sessionId = tenant?.sessionId ?? null;
  // The session id this component last issued a request with. Reset by the
  // unmount that accompanies a recovery, which is exactly what we want: a new
  // mount plus a new session id means there is fresh work to do.
  const attemptedRef = useRef<string | null>(null);

  // The session was rejected — claim a recovery and re-mint. Gated entirely on
  // the module-scoped budget, so this fires at most once per page load.
  useEffect(() => {
    if (status !== 'ready') return;
    if (!(error instanceof SessionExpiredError)) return;
    if (beginSessionRecovery()) retry();
  }, [error, status, retry]);

  // A new session id means any in-flight recovery has landed. Clears the marker
  // without granting a fresh budget — only a genuine success does that. The
  // re-request itself is the store's call: `sessionReady` flipping back to true
  // re-runs `useCategories`, and the store spots that the token differs from the
  // one that failed.
  useEffect(() => {
    if (!sessionReady || !sessionId) return;
    if (attemptedRef.current === sessionId) return;
    attemptedRef.current = sessionId;
    endSessionRecovery();
  }, [sessionId, sessionReady]);

  // A request has come back clean, so the session is healthy again. Gated on a
  // completed load, not merely the absence of an error: a retried request
  // passes through a `loading` snapshot with `error: null`, and treating that
  // as success would replenish the budget mid-retry and restart the loop.
  useEffect(() => {
    if (status !== 'ready') return;
    if (categoriesStatus !== 'ready') return;
    if (error instanceof SessionExpiredError) return;
    resetSessionRecovery();
  }, [error, categoriesStatus, status]);
}
