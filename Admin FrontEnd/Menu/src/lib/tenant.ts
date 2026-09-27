const RESERVED_LABELS = new Set(['www', 'api', 'admin', 'app']);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;

/** The NFC/QR token in the path, e.g. `/t/8fK2xQ`. */
const TABLE_TOKEN_RE = /^[A-Za-z0-9_-]{4,64}$/;

/**
 * Resolve the tenant slug from the hostname at runtime.
 *
 * Host lookup: the hostname must be `<label>.<VITE_BASE_DOMAIN>` where
 * `<label>` is a single, non-reserved label.
 * Dev-only fallbacks (stripped from production builds): a `?tenant=` query
 * parameter, then `VITE_DEV_TENANT`.
 */
export function resolveTenant(): string | null {
  const baseDomain = (import.meta.env.VITE_BASE_DOMAIN ?? '').trim();
  const host = window.location.hostname;
  const suffix = '.' + baseDomain;

  const fromHost = (): string | null => {
    if (!baseDomain || host === baseDomain) return null;
    if (!host.endsWith(suffix)) return null;
    const label = host.slice(0, -suffix.length);
    if (!label || label.includes('.') || RESERVED_LABELS.has(label)) return null;
    return SLUG_RE.test(label) ? label : null;
  };

  const hostSlug = fromHost();
  if (hostSlug) return hostSlug;

  if (import.meta.env.DEV) {
    const query = new URLSearchParams(window.location.search).get('tenant');
    if (query && SLUG_RE.test(query.toLowerCase())) return query.toLowerCase();

    const dev = (import.meta.env.VITE_DEV_TENANT ?? '').trim().toLowerCase();
    if (dev && SLUG_RE.test(dev)) return dev;
  }

  return null;
}

export const TENANT: string | null = resolveTenant();

/** Namespace a storage/state key per tenant so tenants never share data. */
export function tenantScopedKey(key: string): string {
  return TENANT ? `${key}:${TENANT}` : key;
}

/** Extract the NFC/QR table token from a pathname, or null when invalid. */
export function parseTableToken(pathname: string): string | null {
  const match = pathname.match(/^\/t\/([^/?#]+)/);
  if (!match) return null;
  return TABLE_TOKEN_RE.test(match[1]) ? match[1] : null;
}