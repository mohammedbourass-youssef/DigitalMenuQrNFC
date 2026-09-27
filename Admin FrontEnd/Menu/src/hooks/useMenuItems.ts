import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSessionReady } from '@/hooks/useCategories';
import {
  ensureMenuItems,
  getMenuItemsSnapshot,
  subscribeMenuItems,
  type MenuItemsSnapshot,
} from '../lib/menuItemsStore';

/**
 * Menu items for the active language and category, as a `useSyncExternalStore`
 * subscription to the shared store.
 *
 * The fetch is kicked off from an effect rather than during render, and only
 * once a session token exists — `/api/tenant/menu` is session-guarded, so a
 * request dispatched before `/api/tenant/info` resolves would be rejected.
 *
 * A `null` categoryId means the frontend "All" tab, which fetches across every
 * category rather than filtering a full response client-side.
 */
export function useMenuItems(categoryId: string | null): MenuItemsSnapshot {
  const { lang } = useLanguage();
  const sessionReady = useSessionReady();

  const subscribe = useCallback((listener: () => void) => subscribeMenuItems(listener), []);
  const getSnapshot = useCallback(
    () => getMenuItemsSnapshot(lang, categoryId),
    [lang, categoryId],
  );

  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    if (!sessionReady) return;
    ensureMenuItems(lang, categoryId);
  }, [lang, categoryId, sessionReady]);

  return snapshot;
}
