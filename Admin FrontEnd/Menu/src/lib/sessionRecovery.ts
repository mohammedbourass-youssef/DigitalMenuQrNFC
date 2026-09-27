import { clearSessionId } from './session';

/**
 * How many times a single page load may silently re-mint the session and retry.
 * One retry covers a session that expired between app start and first request.
 *
 * The budget is capped because a 400/404 can also come from the controller
 * rather than the session middleware (a malformed `lang`, or an unknown
 * tenant) — retrying cannot fix those, and an uncapped budget loops forever.
 */
const MAX_RECOVERIES = 1;

/**
 * Module-scoped on purpose. `TenantProvider` unmounts its children while
 * re-fetching tenant info, so any per-component ref holding this state is
 * destroyed by the recovery it is meant to limit.
 */
let recoveryCount = 0;
let recovering = false;

/**
 * Claim the single recovery attempt. Returns false once the budget is spent or
 * while a recovery is already in flight, so the caller must gate `retry()` on
 * the return value.
 */
export function beginSessionRecovery(): boolean {
  if (recovering || recoveryCount >= MAX_RECOVERIES) return false;
  recoveryCount += 1;
  recovering = true;
  clearSessionId();
  return true;
}

/** A usable session is back — clear the in-flight marker. */
export function endSessionRecovery(): void {
  recovering = false;
}

/**
 * Allow a later genuine expiry to be recovered from. Called only once a
 * session-guarded request has actually succeeded, so a failing request can
 * never reset the budget and restart the loop.
 */
export function resetSessionRecovery(): void {
  recoveryCount = 0;
  recovering = false;
}
