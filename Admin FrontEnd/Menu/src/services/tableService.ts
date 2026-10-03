import { apiFetch, isMockMode } from '../lib/api';
import { ApiError, SessionExpiredError } from '../lib/errors';
import { mockGetTables } from '../lib/mock';
import type { TablesResponse, TablePublicDTO } from '../types/table';

const PATH = '/api/tenant/Tables';

/**
 * Statuses the session middleware uses when it rejects a request before it
 * reaches the controller. 400 is deliberately excluded: the controller also
 * returns 400 for its own problems, and retrying a re-minted session cannot fix
 * those, so treating it as a session issue would spend the recovery budget.
 */
const SESSION_STATUSES = new Set([401, 403, 404, 410]);

/**
 * A 400 complaining about the session header itself is a client/server contract
 * mismatch rather than an expired session — re-minting cannot fix it, so it
 * must not consume the single recovery attempt.
 */
function isMalformedSessionHeader(error: ApiError): boolean {
  return error.status === 400 && error.message.toLowerCase().includes('x-session-id');
}

/**
 * Fetches the tenant's tables.
 *
 * `X-Session-Id` is attached by the shared wrapper in `lib/api.ts`, which reads
 * the stored token — the same mechanism and the same code path the menu and
 * categories requests use, so there is no second session flow here.
 *
 * The endpoint takes no `lang`: the response is a table list, not localised
 * content, so there is nothing to re-fetch when the language changes.
 */
export async function fetchTables(): Promise<TablePublicDTO[]> {
  if (isMockMode()) return mockGetTables();

  try {
    const response = await apiFetch<TablesResponse | null>(PATH);
    // 204 No Content arrives as null; tolerate a missing/!Array `data` so a
    // shape change surfaces as an empty list rather than a render crash.
    return Array.isArray(response?.data) ? response.data : [];
  } catch (error) {
    if (
      error instanceof ApiError &&
      SESSION_STATUSES.has(error.status) &&
      !isMalformedSessionHeader(error)
    ) {
      // Routed through the same SessionExpiredError the menu and categories
      // fetches use, so `useSessionExpiryGuard` re-mints the session for this
      // endpoint without any extra wiring.
      throw new SessionExpiredError(error.status, error.message);
    }
    throw error;
  }
}
