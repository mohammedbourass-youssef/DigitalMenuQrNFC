import { apiFetch, isMockMode } from '../lib/api';
import { ApiError, SessionExpiredError } from '../lib/errors';
import { mockGetCategories } from '../lib/mock';
import type { Language } from '../types';
import type { CategoriesResponse, PublicCategory } from '../types/category';

const PATH = '/api/tenant/Categories';

/**
 * Statuses the session middleware uses to reject a request before it reaches
 * the controller: 400 (missing/malformed X-Session-Id), 404 (unknown, inactive
 * or wrong-tenant session), 410 (expired session). The controller itself also
 * uses 400/404 for its own problems, and both layers return a `{ error }`
 * body, so they are handled uniformly here.
 */
const SESSION_STATUSES = new Set([400, 404, 410]);

/**
 * A 400 complaining about the X-Session-Id header itself is a client/server
 * contract mismatch, not an expired session: the token we were issued cannot be
 * parsed as whatever the middleware expects. Re-minting a session cannot fix
 * that, so it must not consume the single recovery attempt — otherwise the app
 * churns through sessions and then shows an error anyway.
 */
function isMalformedSessionHeader(error: ApiError): boolean {
  return error.status === 400 && error.message.toLowerCase().includes('x-session-id');
}

/**
 * Fetches the public category list for the current restaurant.
 *
 * Requires the `X-Session-Id` header, which the shared fetch wrapper attaches
 * from the session stored at startup. Session rejections are surfaced as
 * `SessionExpiredError` so the caller can re-mint the session and retry.
 *
 * Returns an empty array on 204 No Content — the backend signals "no
 * categories" with an empty body rather than an empty `data` array.
 */
export async function fetchCategories(lang: Language): Promise<PublicCategory[]> {
  if (isMockMode()) return mockGetCategories(lang);

  try {
    const response = await apiFetch<CategoriesResponse | null>(
      `${PATH}?lang=${encodeURIComponent(lang)}`,
    );
    // 204 No Content arrives as null; also tolerate a missing/!Array `data`.
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
