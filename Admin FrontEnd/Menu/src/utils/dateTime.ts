/**
 * Single source of truth for every date/time rendered in the UI.
 *
 * Two rules this module exists to enforce:
 *
 * 1. **No component formats dates itself.** Everything goes through these
 *    helpers so there is exactly one place to change.
 * 2. **Device-local time, never UTC on screen.** No `timeZone` option is ever
 *    passed to `Intl`, so the browser's own zone is used automatically and the
 *    app is correct wherever the phone is. Nothing is hardcoded to an offset.
 *
 * Parsing matters as much as formatting: the backend serializes UTC instants
 * and may omit the `Z` suffix. `new Date('2026-10-02T14:30:00')` is parsed as
 * *local* time by the browser, which silently shifts the displayed hour. We
 * therefore normalize the string to an explicit UTC instant before parsing.
 */

/** Anything that may hold an instant. `null`/`undefined`/blank are tolerated. */
export type IsoInput = string | null | undefined;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Trailing `Z`, or a numeric offset such as `+02:00` / `-0500`. */
const HAS_EXPLICIT_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Parse a UTC instant into a `Date`, or `null` when the value is missing or
 * unparseable. Never returns an `Invalid Date`.
 *
 * A naive timestamp (`2026-10-02T14:30:00`) is treated as UTC, matching the
 * `...Utc` fields it comes from. An explicit offset is respected as-is. A
 * date-only value is anchored to UTC midnight rather than local midnight.
 */
export function parseUtcIso(value: IsoInput): Date | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  let normalized: string;
  if (DATE_ONLY.test(trimmed)) {
    normalized = `${trimmed}T00:00:00Z`;
  } else if (HAS_EXPLICIT_OFFSET.test(trimmed)) {
    normalized = trimmed;
  } else {
    normalized = `${trimmed}Z`;
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Cache `Intl` formatters: constructing them is comparatively expensive and
 * the same handful of options are reused on every render.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

/**
 * The host's current timezone.
 *
 * This is part of the cache key on purpose. `Intl.DateTimeFormat` resolves and
 * freezes the zone when it is constructed, so a formatter cached under one zone
 * keeps rendering in that zone even if the device timezone changes while the app
 * is running. Keying on the zone keeps caching effective in the common case
 * (timezone is stable) without ever going stale.
 */
function currentTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function dateTimeFormat(locale: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const zone = currentTimeZone();
  const key = `${locale}|${zone}|${JSON.stringify(options)}`;
  let cached = formatterCache.get(key);
  if (!cached) {
    // `locale` may be any app language tag; fall back rather than throw.
    try {
      cached = new Intl.DateTimeFormat(locale, options);
    } catch {
      cached = new Intl.DateTimeFormat(undefined, options);
    }
    formatterCache.set(key, cached);
  }
  return cached;
}

/** Local clock time, e.g. `14:30` or `2:30 PM`. Empty string if unparseable. */
export function formatTime(value: IsoInput, locale?: string): string {
  const date = parseUtcIso(value);
  if (!date) return '';
  return dateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
}

/** Local date, e.g. `2 Oct 2026`. Empty string if unparseable. */
export function formatDate(value: IsoInput, locale?: string): string {
  const date = parseUtcIso(value);
  if (!date) return '';
  return dateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

/** Local date + time. Empty string if unparseable. */
export function formatDateTime(value: IsoInput, locale?: string): string {
  const date = parseUtcIso(value);
  if (!date) return '';
  return dateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

const RELATIVE_UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ['year', 31_536_000_000],
  ['month', 2_592_000_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
  ['second', 1_000],
];

/**
 * Localized relative time, e.g. `5 minutes ago`. Handles future instants too
 * (`in 2 minutes`) rather than rendering something wrong.
 */
export function formatRelative(value: IsoInput, locale?: string, now: number = Date.now()): string {
  const date = parseUtcIso(value);
  if (!date) return '';
  const diffMs = date.getTime() - now;

  let formatter: Intl.RelativeTimeFormat;
  try {
    formatter = new Intl.RelativeTimeFormat(locale ?? undefined, { numeric: 'auto' });
  } catch {
    formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  }

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diffMs) >= ms || unit === 'second') {
      return formatter.format(Math.round(diffMs / ms), unit);
    }
  }
  return '';
}

/** True when both instants fall on the same calendar day *in device time*. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Timestamp for a timeline step: the local time, prefixed with the local date
 * when the step is not from today. Returns `''` for missing/invalid values so
 * an upcoming (or malformed) step simply shows nothing instead of "Invalid Date".
 */
export function formatStepTimestamp(value: IsoInput, locale?: string, now: number = Date.now()): string {
  const date = parseUtcIso(value);
  if (!date) return '';
  const time = formatTime(value, locale);
  if (!time) return '';
  if (isSameLocalDay(date, new Date(now))) return time;
  return `${formatDate(value, locale)} ${time}`;
}
