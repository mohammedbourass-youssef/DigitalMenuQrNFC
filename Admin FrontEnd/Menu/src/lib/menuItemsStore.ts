import { fetchMenuItems } from '../services/menuItemService';
import { getSessionId, hasSessionId } from './session';
import type { Language } from '../types';
import type { MenuItemPublicDTO } from '../types/menuItem';

export type MenuItemsStatus = 'loading' | 'ready' | 'error';

export interface MenuItemsSnapshot {
  status: MenuItemsStatus;
  items: MenuItemPublicDTO[];
  /** `null` unless status is 'error'. */
  error: unknown;
}

const LOADING: MenuItemsSnapshot = { status: 'loading', items: [], error: null };

/**
 * Snapshots are cached per language *and* scope. The endpoint localises and
 * filters server-side, so switching either one is a different request, not a
 * re-filter of what we already hold.
 *
 * Stable object references per key are required — `useSyncExternalStore`
 * compares with `Object.is` and would loop forever on a fresh object per call.
 */
const snapshots = new Map<string, MenuItemsSnapshot>();
const listeners = new Set<() => void>();
const inFlight = new Map<string, Promise<void>>();
/** Bumped per request so a superseded response can't clobber a newer one. */
const generations = new Map<string, number>();
/** Keys a request has actually been dispatched for. */
const attempted = new Set<string>();
/**
 * The session token in force when a key's last request failed. Comparing it to
 * the current token is what separates a stale-session failure (worth one more
 * attempt) from a genuine error (retrying would just repeat it).
 */
const failedSession = new Map<string, string | null>();

function cacheKey(lang: Language, categoryId: string | null): string {
  return `${lang}|${categoryId ?? 'all'}`;
}

function snapshotFor(key: string): MenuItemsSnapshot {
  const existing = snapshots.get(key);
  if (existing) return existing;
  snapshots.set(key, LOADING);
  return LOADING;
}

function commit(key: string, next: MenuItemsSnapshot): void {
  snapshots.set(key, next);
  listeners.forEach((listener) => listener());
}

function load(key: string, lang: Language, categoryId: string | null): Promise<void> {
  const existing = inFlight.get(key);
  if (existing) return existing;

  // This is a [NeedSession] route and the token only exists once
  // /api/tenant/info has resolved. Every fetch funnels through here, so this
  // one check keeps the request from ever being sent early.
  if (!hasSessionId()) return Promise.resolve();

  const generation = (generations.get(key) ?? 0) + 1;
  generations.set(key, generation);
  const isCurrent = (): boolean => generations.get(key) === generation;
  attempted.add(key);

  const promise = (async () => {
    try {
      const items = await fetchMenuItems(lang, { categoryId });
      if (isCurrent()) commit(key, { status: 'ready', items, error: null });
    } catch (error) {
      if (isCurrent()) {
        failedSession.set(key, getSessionId());
        commit(key, { status: 'error', items: [], error });
      }
    } finally {
      if (isCurrent()) inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

/**
 * Kick off the fetch for this key if it hasn't run, isn't already running, and
 * isn't sitting on a failure that repeating would reproduce.
 *
 * The store — not the session guard — owns the "retry against the new session"
 * decision: the caller just signals that a session is available, and comparing
 * it to the token that failed is enough to tell the two cases apart.
 */
export function ensureMenuItems(lang: Language, categoryId: string | null): void {
  const key = cacheKey(lang, categoryId);
  if (inFlight.has(key)) return;

  const snapshot = snapshotFor(key);
  if (snapshot.status === 'ready') return;

  if (attempted.has(key) && snapshot.status === 'error') {
    if (failedSession.get(key) === getSessionId()) return;
  }

  void load(key, lang, categoryId);
}

/** Force a re-fetch of one key, e.g. after a failed request the user retries. */
export function refreshMenuItems(lang: Language, categoryId: string | null): Promise<void> {
  const key = cacheKey(lang, categoryId);
  inFlight.delete(key);
  commit(key, LOADING);
  return load(key, lang, categoryId);
}

export function getMenuItemsSnapshot(lang: Language, categoryId: string | null): MenuItemsSnapshot {
  return snapshotFor(cacheKey(lang, categoryId));
}

export function subscribeMenuItems(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
