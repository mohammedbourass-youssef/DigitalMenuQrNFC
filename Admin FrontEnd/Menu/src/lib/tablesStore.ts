import { fetchTables } from '../services/tableService';
import { getSessionId, hasSessionId } from './session';
import type { TablePublicDTO } from '../types/table';

export type TablesStatus = 'loading' | 'ready' | 'error';

export interface TablesSnapshot {
  status: TablesStatus;
  tables: TablePublicDTO[];
  /** `null` unless status is 'error'. */
  error: unknown;
}

const LOADING: TablesSnapshot = { status: 'loading', tables: [], error: null };

/**
 * A single snapshot: the table list is not localised and not category-scoped, so
 * unlike the menu and category caches there is only ever one key.
 *
 * The object reference stays stable between commits — `useSyncExternalStore`
 * compares with `Object.is` and would loop forever on a fresh object each call.
 */
let snapshot: TablesSnapshot = LOADING;
const listeners = new Set<() => void>();
let inFlight: Promise<void> | null = null;
/** Bumped per request so a superseded response can't clobber a newer one. */
let generation = 0;
let attempted = false;
/**
 * The session token in force when the last request failed. Comparing it to the
 * current token is what separates a stale-session failure (worth one more
 * attempt) from a genuine error (retrying would just repeat it).
 */
let failedSession: string | null = null;

function commit(next: TablesSnapshot): void {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function load(): Promise<void> {
  if (inFlight) return inFlight;

  // This is a [NeedSession] route and the token only exists once
  // /api/tenant/info has resolved, so the request must not be sent before then.
  if (!hasSessionId()) return Promise.resolve();

  generation += 1;
  const isCurrent = (): boolean => generation === currentGeneration;
  const currentGeneration = generation;
  attempted = true;

  const promise = (async () => {
    try {
      const tables = await fetchTables();
      if (isCurrent()) commit({ status: 'ready', tables, error: null });
    } catch (error) {
      if (isCurrent()) {
        failedSession = getSessionId();
        commit({ status: 'error', tables: [], error });
      }
    } finally {
      if (isCurrent()) inFlight = null;
    }
  })();

  inFlight = promise;
  return promise;
}

/**
 * Kick off the fetch if it hasn't run, isn't already running, and isn't sitting
 * on a failure that repeating would reproduce.
 *
 * As with the other stores, this — not the session guard — owns the "retry
 * against the new session" decision: the caller only signals that a session is
 * available, and comparing it to the token that failed separates the cases.
 */
export function ensureTables(): void {
  if (inFlight) return;
  if (snapshot.status === 'ready') return;
  if (attempted && snapshot.status === 'error' && failedSession === getSessionId()) return;
  void load();
}

/** Force a re-fetch, e.g. from a retry button. */
export function refreshTables(): Promise<void> {
  inFlight = null;
  commit(LOADING);
  return load();
}

export function getTablesSnapshot(): TablesSnapshot {
  return snapshot;
}

export function subscribeTables(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
