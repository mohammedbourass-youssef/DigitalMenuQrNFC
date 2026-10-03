import { DEFAULT_LANGUAGE, isSupportedLanguage, type LanguageCode } from './constants';
import { tenantScopedKey } from './tenant';
import { storageGet } from './storage';
import { detectDeviceLanguage } from './detectLanguage';

/**
 * The single normalization point for the active language.
 *
 * Everything that needs a language code — the `X-Lang` request header, the
 * legacy `lang` body/query fields, and the mock adapter — goes through
 * `getLangCode()`, so a locale tag can never leak out as `ar-MA` or `FR`.
 */

/** Where the customer's language choice is persisted, per tenant. */
export const LANG_KEY = tenantScopedKey('lang');

/**
 * Reduce any locale-ish value to a supported 2-letter lowercase code.
 *
 *   "ar-MA" -> "ar"   region subtag dropped
 *   "fr_FR" -> "fr"   underscore separator tolerated
 *   "EN"    -> "en"   case-insensitive
 *   ""      -> "en"   (DEFAULT_LANGUAGE)
 *   "pt"    -> "en"   unsupported falls back to the app default
 *
 * Never throws and never returns something outside `SUPPORTED_LANGUAGES`.
 */
export function getLangCode(value?: string | null): LanguageCode {
  if (typeof value !== 'string') return DEFAULT_LANGUAGE;

  const primary = value.trim().replace(/_/g, '-').split('-')[0]?.toLowerCase() ?? '';
  if (!primary) return DEFAULT_LANGUAGE;

  return isSupportedLanguage(primary) ? primary : DEFAULT_LANGUAGE;
}

/**
 * The language to start the app in: the tenant-scoped stored choice, else the
 * device language. Shared with `LanguageProvider` so both agree on the first
 * paint instead of each deriving it separately.
 */
export function resolveInitialLang(): LanguageCode {
  const stored = storageGet<string | null>(LANG_KEY, null);
  if (stored) return getLangCode(stored);
  return getLangCode(detectDeviceLanguage());
}

/**
 * Module-level mirror of the active language.
 *
 * `lib/api.ts` is a plain module with no access to React context, but the
 * header must reflect the language *at request time* so switching languages
 * affects the very next request without a reload. `LanguageProvider` pushes
 * every change here; this mirrors how `lib/session.ts` keeps `memorySessionId`
 * in step with storage.
 *
 * Starts as `null` and falls back to `resolveInitialLang()` so a request that
 * somehow precedes the provider still sends a sensible code.
 */
let activeLang: LanguageCode | null = null;

/** Called by `LanguageProvider` whenever the language changes. */
export function setActiveLang(value: string | null | undefined): void {
  activeLang = getLangCode(value);
}

/** The normalized language to put on outgoing requests. */
export function getActiveLangCode(): LanguageCode {
  if (activeLang === null) activeLang = resolveInitialLang();
  return activeLang;
}
