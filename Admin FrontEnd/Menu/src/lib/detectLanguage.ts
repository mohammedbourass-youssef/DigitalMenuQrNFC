import { DEFAULT_LANGUAGE, isSupportedLanguage, type LanguageCode } from './constants';

/**
 * Best-effort detection of the device UI language from the browser locale.
 *
 * Examples:
 *   navigator.languages = ["fr-MA", "en-US"]  -> "fr"
 *   navigator.languages = ["pt-BR", "en-US"]  -> not supported -> "en"
 *   navigator.language   = "zh-CN"            -> "zh"
 *   navigator.language   = "de"               -> "de"
 *   navigator.languages  = ["ar-MA"]          -> "ar"
 *
 * The primary subtag (text before the first "-") is matched against
 * SUPPORTED_LANGUAGES. Never throws, even when navigator.languages is
 * unavailable.
 */
export function detectDeviceLanguage(): LanguageCode {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;
  const candidates =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
  for (const tag of candidates) {
    if (!tag || typeof tag !== 'string') continue;
    const primary = tag.split('-')[0]?.toLowerCase() ?? '';
    if (isSupportedLanguage(primary)) return primary as LanguageCode;
  }
  return DEFAULT_LANGUAGE;
}