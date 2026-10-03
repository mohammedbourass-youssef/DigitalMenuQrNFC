/**
 * Single source of truth for supported languages and currencies.
 */

export const SUPPORTED_LANGUAGES = ['fr', 'ar', 'en', 'es', 'it', 'ja', 'zh', 'ko', 'de'] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

/** Languages whose UI is rendered right-to-left. */
export const RTL_LANGUAGES: LanguageCode[] = ['ar'];

export const SUPPORTED_CURRENCIES = ['MAD', 'USD', 'EUR', 'JPY', 'KRW', 'CNY', 'GBP'] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/** Native display names (+ flag) for the language combobox. */
export const LANGUAGE_LABELS: Record<LanguageCode, { nativeName: string; flag: string }> = {
  fr: { nativeName: 'Français', flag: '🇫🇷' },
  ar: { nativeName: 'العربية', flag: '🇲🇦' },
  en: { nativeName: 'English', flag: '🇬🇧' },
  es: { nativeName: 'Español', flag: '🇪🇸' },
  it: { nativeName: 'Italiano', flag: '🇮🇹' },
  ja: { nativeName: '日本語', flag: '🇯🇵' },
  zh: { nativeName: '中文', flag: '🇨🇳' },
  ko: { nativeName: '한국어', flag: '🇰🇷' },
  de: { nativeName: 'Deutsch', flag: '🇩🇪' },
};

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  MAD: 'Moroccan Dirham',
  USD: 'US Dollar',
  EUR: 'Euro',
  JPY: 'Japanese Yen',
  KRW: 'South Korean Won',
  CNY: 'Chinese Yuan',
  GBP: 'British Pound',
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  MAD: 'MAD',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  KRW: '₩',
  CNY: '¥',
  GBP: '£',
};

export function isSupportedLanguage(value: string): value is LanguageCode {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/**
 * Symbols and aliases that tenant records use in place of an ISO 4217 code.
 * Tenants store values like "€" or "MAD" interchangeably, so a strict code
 * check would reject them and silently fall back to device detection.
 */
const CURRENCY_ALIASES: Record<string, CurrencyCode> = {
  '€': 'EUR',
  EUR: 'EUR',
  $: 'USD',
  'US$': 'USD',
  USD: 'USD',
  '£': 'GBP',
  '£UK': 'GBP',
  GBP: 'GBP',
  '¥': 'JPY',
  '￥': 'JPY',
  JPY: 'JPY',
  '₩': 'KRW',
  KRW: 'KRW',
  '元': 'CNY',
  CNY: 'CNY',
  'د.م.': 'MAD',
  'DH': 'MAD',
  MAD: 'MAD',
};

/**
 * Resolve a stored currency value to a supported ISO code. Accepts ISO codes,
 * display symbols and common aliases; returns null when nothing matches so
 * callers can decide on a fallback.
 */
export function normalizeCurrency(value: string | null | undefined): CurrencyCode | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (isSupportedCurrency(upper)) return upper;
  return CURRENCY_ALIASES[trimmed] ?? CURRENCY_ALIASES[upper] ?? null;
}
