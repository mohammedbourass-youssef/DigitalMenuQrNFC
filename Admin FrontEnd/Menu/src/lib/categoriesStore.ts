import { fetchCategories } from '../services/categoryService';
import { getSessionId, hasSessionId } from './session';
import type { Language } from '../types';
import type { CategoriesSnapshot, PublicCategory } from '../types/category';

const LOADING: CategoriesSnapshot = { status: 'loading', categories: [], error: null };

/**
 * Snapshots are cached per language: the endpoint localises server-side, so
 * switching language has to re-fetch rather than re-filter. A stable object
 * reference per language is required — `useSyncExternalStore` compares with
 * `Object.is` and would loop forever on a fresh object each call.
 */
const snapshots = new Map<Language, CategoriesSnapshot>();
const listeners = new Set<() => void>();
const inFlight = new Map<Language, Promise<void>>();
/** Bumped per request so a superseded response can't clobber a newer one. */
const generations = new Map<Language, number>();
/** Languages a request has actually been dispatched for. */
const attempted = new Set<Language>();
/**
 * The session token in force when a language's last request failed. Comparing
 * it against the current token is what tells a stale-session failure (worth one
 * more attempt) apart from a genuine error (retrying would just repeat it).
 */
const failedSession = new Map<Language, string | null>();

function snapshotFor(lang: Language): CategoriesSnapshot {
  const existing = snapshots.get(lang);
  if (existing) return existing;
  snapshots.set(lang, LOADING);
  return LOADING;
}

function commit(lang: Language, next: CategoriesSnapshot): void {
  snapshots.set(lang, next);
  listeners.forEach((listener) => listener());
}

function load(lang: Language): Promise<void> {
  const existing = inFlight.get(lang);
  if (existing) return existing;

  // Backstop for the race the endpoint imposes: this is a [NeedSession] route,
  // and the token is only written once /api/tenant/info resolves. Every fetch
  // funnels through here, so this one check is enough to guarantee no request
  // is sent before a token exists. Callers re-invoke `load` once the session
  // lands (see `useSessionReady`), so the snapshot stays 'loading' until then.
  if (!hasSessionId()) return Promise.resolve();

  const generation = (generations.get(lang) ?? 0) + 1;
  generations.set(lang, generation);
  const isCurrent = (): boolean => generations.get(lang) === generation;
  attempted.add(lang);

  const promise = (async () => {
    try {
      const categories: PublicCategory[] = await fetchCategories(lang);
      if (isCurrent()) commit(lang, { status: 'ready', categories, error: null });
    } catch (error) {
      if (isCurrent()) {
        failedSession.set(lang, getSessionId());
        commit(lang, { status: 'error', categories: [], error });
      }
    } finally {
      if (isCurrent()) inFlight.delete(lang);
    }
  })();

  inFlight.set(lang, promise);
  return promise;
}

export function getCategoriesSnapshot(lang: Language): CategoriesSnapshot {
  return snapshotFor(lang);
}

export function subscribeCategories(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Kick off the fetch for `lang` if it hasn't run, isn't already running, and
 * isn't sitting on a failure that repeating would reproduce.
 *
 * This is the single entry point for the fetch, which is why the store — not
 * the session guard — owns the "retry against the new session" decision. The
 * caller just signals that a session is available; comparing it to the token
 * that failed is enough to tell the two cases apart.
 */
export function ensureCategories(lang: Language): void {
  if (inFlight.has(lang)) return;

  const snapshot = snapshotFor(lang);
  if (snapshot.status === 'ready') return;

  if (attempted.has(lang) && snapshot.status === 'error') {
    if (failedSession.get(lang) === getSessionId()) return;
  }

  void load(lang);
}
