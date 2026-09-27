import { DEFAULT_CURRENCY, isSupportedCurrency, type CurrencyCode } from './constants';

/**
 * Region subtags produce the currency that is used there.
 * "fr-MA" -> MA -> MAD, "en-US" -> US -> USD.
 */
const REGION_TO_CURRENCY: Record<string, CurrencyCode> = {
  MA: 'MAD',
  US: 'USD',
  // Eurozone
  FR: 'EUR',
  DE: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  PT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  IE: 'EUR',
  AT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  LU: 'EUR',
  GB: 'GBP',
  JP: 'JPY',
  KR: 'KRW',
  CN: 'CNY',
};

/** Extract the first 2-letter region subtag (e.g. "fr-MA" -> "MA"). */
function extractRegion(tag: string): string | null {
  const parts = tag.split('-');
  for (let i = 1; i < parts.length; i += 1) {
    const part = parts[i] ?? '';
    if (/^[A-Za-z]{2}$/.test(part)) return part.toUpperCase();
  }
  return null;
}

/**
 * Best-effort client-side guess of the user's currency, derived from the
 * locale region (there is no direct "device currency" browser API).
 *
 * Examples:
 *   navigator.language = "fr-MA"          -> "MAD"
 *   navigator.language = "en-US"          -> "USD"
 *   navigator.language = "de-DE"          -> "EUR"
 *   navigator.language = "ja"             -> no region -> "USD" (default)
 *   navigator.language = "en-CA"          -> region not mapped -> "USD"
 *
 * This will be superseded by the tenant's own configured currency once the
 * tenant API responds (see TenantContext) — this detector only sets the
 * initial guess.
 */
export function detectDeviceCurrency(): CurrencyCode {
  if (typeof navigator === 'undefined') return DEFAULT_CURRENCY;
  const candidates =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
  for (const tag of candidates) {
    if (!tag || typeof tag !== 'string') continue;
    const region = extractRegion(tag);
    if (!region) continue;
    const currency = REGION_TO_CURRENCY[region];
    if (currency && isSupportedCurrency(currency)) return currency;
  }
  return DEFAULT_CURRENCY;
}