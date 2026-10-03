import { apiFetch, isMockMode } from '../lib/api';
import { ApiError, SessionExpiredError } from '../lib/errors';
import { getLangCode } from '../lib/lang';
import { mockGetMenuItems } from '../lib/mock';
import type { Language } from '../types';
import type { CurrencyCode } from '../lib/constants';
import type { MenuItemsResponse, MenuItemPublicDTO, MenuScope } from '../types/menuItem';

const PATH = '/api/tenant/menu';

/**
 * Statuses the session middleware uses when it rejects a request before it
 * reaches the controller. 400 is deliberately excluded: the controller also
 * returns 400 for a missing/unknown `categoryId`, and retrying a re-minted
 * session cannot fix a bad category, so treating it as a session problem would
 * spend the recovery budget on a user error.
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
 * Fetches menu items for the active language, scoped to one category or across
 * all of them.
 *
 * `X-Session-Id` is attached by the shared wrapper in `lib/api.ts`, which reads
 * the stored token; callers must have a session before invoking this.
 *
 * The endpoint localises and prices server-side, so a language or currency
 * change is a new request rather than a re-render of cached data.
 *
 * @param currency the visitor's currently selected display currency, sent as
 *   `currency` so the backend prices the response in the same one.
 */
export async function fetchMenuItems(
  lang: Language,
  { categoryId }: MenuScope,
  currency: CurrencyCode,
): Promise<MenuItemPublicDTO[]> {
  const code = getLangCode(lang);
  if (isMockMode()) return mockGetMenuItems(code, { categoryId });

  // Legacy query parameter; the request also carries X-Lang.
  const params = new URLSearchParams({ lang: code });
  params.set('currency', currency);
  if (categoryId) {
    params.set('getAll', 'false');
    params.set('categoryId', categoryId);
  } else {
    params.set('getAll', 'true');
  }

  try {
    const response = await apiFetch<MenuItemsResponse | null>(`${PATH}?${params.toString()}`);
    // 204 No Content arrives as null; tolerate a missing/!Array `data` too, so a
    // shape change surfaces as an empty list rather than a render crash.
    return Array.isArray(response?.data) ? response.data : [];
  } catch (error) {
    if (
      error instanceof ApiError &&
      SESSION_STATUSES.has(error.status) &&
      !isMalformedSessionHeader(error)
    ) {
      throw new SessionExpiredError(error.status, error.message);
    }
    throw error;
  }
}
