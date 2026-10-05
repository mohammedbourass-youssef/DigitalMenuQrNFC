import i18n from '@/i18n';
import { CURRENCIES, DEFAULT_CURRENCY_CODE } from '@/lib/currencies';

/** Key already used by src/i18n and the Settings language picker. */
export const LANGUAGE_STORAGE_KEY = 'app-language';
export const CURRENCY_STORAGE_KEY = 'currency';

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'ar'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Reuse the project's currency list so the header can never send a code the
 *  backend does not accept (it would silently fall back to its own default). */
export const SUPPORTED_CURRENCIES = CURRENCIES;
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';
export const DEFAULT_CURRENCY: string = DEFAULT_CURRENCY_CODE;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode / disabled cookies) - keep in-memory behaviour */
  }
}

export function normalizeLanguage(code: unknown): SupportedLanguage {
  const base = String(code ?? '').split('-')[0].trim().toLowerCase();
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base)
    ? (base as SupportedLanguage)
    : DEFAULT_LANGUAGE;
}

export function normalizeCurrency(code: unknown): string {
  const upper = String(code ?? '').trim().toUpperCase();
  return isSupportedCurrency(upper) ? upper : DEFAULT_CURRENCY;
}

/** True only for codes the backend accepts (anything else falls back to MAD). */
export function isSupportedCurrency(code: unknown): boolean {
  const upper = String(code ?? '').trim().toUpperCase();
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(upper);
}

export function getLanguage(): SupportedLanguage {
  const stored = safeGet(LANGUAGE_STORAGE_KEY);
  if (stored) return normalizeLanguage(stored);
  return normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
}

/** Persist the language and push it into i18n (which also updates `dir` for RTL). */
export function setLanguage(code: string): SupportedLanguage {
  const normalized = normalizeLanguage(code);
  safeSet(LANGUAGE_STORAGE_KEY, normalized);
  if (i18n.resolvedLanguage !== normalized) {
    void i18n.changeLanguage(normalized);
  }
  return normalized;
}

export function getCurrency(): string {
  return normalizeCurrency(safeGet(CURRENCY_STORAGE_KEY));
}

/** Currency changes are not routed through i18n, so they need their own signal. */
type CurrencyListener = (currency: string) => void;
const currencyListeners = new Set<CurrencyListener>();

/** Subscribe to currency changes; returns the unsubscribe function. */
export function onCurrencyChange(listener: CurrencyListener): () => void {
  currencyListeners.add(listener);
  return () => {
    currencyListeners.delete(listener);
  };
}

export function setCurrency(code: string): string {
  const normalized = normalizeCurrency(code);
  const previous = getCurrency();
  safeSet(CURRENCY_STORAGE_KEY, normalized);
  // Only announce a real change, otherwise seeding would loop.
  if (normalized !== previous) {
    currencyListeners.forEach((listener) => listener(normalized));
  }
  return normalized;
}

/** True when a currency was explicitly chosen/persisted (used to seed the
 *  preference from the restaurant record exactly once). */
export function hasStoredCurrency(): boolean {
  return safeGet(CURRENCY_STORAGE_KEY) !== null;
}

/** Headers read by LanguageMiddleware / CurrencyMiddleware on every endpoint. */
export function getPreferenceHeaders(): Record<string, string> {
  return {
    'X-Lang': getLanguage(),
    'X-Currency': getCurrency(),
  };
}