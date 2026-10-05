/**
 * Hub URLs are mapped at the app root in ASP.NET Core, next to (not under) the
 * `/api` segment the REST endpoints live behind. Deriving them from the same
 * env value keeps the base URL in one place.
 */

/** Same env key `src/lib/axios.ts` reads, with the same dev fallback. */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
}

/** Builds an absolute hub URL for a path such as `/hubs/order-live-changes`. */
export function resolveHubUrl(hubPath: string): string {
  const withoutTrailingSlash = getApiBaseUrl().replace(/\/+$/, '');
  const origin = withoutTrailingSlash.replace(/\/api$/i, '');

  return `${origin}${hubPath}`;
}
