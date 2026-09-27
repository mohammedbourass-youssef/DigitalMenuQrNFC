import { useEffect, useSyncExternalStore } from 'react';
import { useSessionReady } from '@/hooks/useCategories';
import { ensureTables, getTablesSnapshot, subscribeTables } from '../lib/tablesStore';
import type { TablesSnapshot } from '../lib/tablesStore';

/**
 * The tenant's tables, as a `useSyncExternalStore` subscription to the shared
 * store — the same pattern the menu and categories lists use.
 *
 * The fetch is kicked off from an effect rather than during render, and only
 * once a session token exists: `/api/tenant/Tables` is session-guarded, so a
 * request dispatched before `/api/tenant/info` resolves would be rejected.
 *
 * `useSessionReady` also flips back to true after a session re-mint, which
 * re-runs the effect; the store then notices the token changed and retries.
 */
export function useTables(): TablesSnapshot {
  const sessionReady = useSessionReady();

  const snapshot = useSyncExternalStore(subscribeTables, getTablesSnapshot);

  useEffect(() => {
    if (!sessionReady) return;
    ensureTables();
  }, [sessionReady]);

  return snapshot;
}
