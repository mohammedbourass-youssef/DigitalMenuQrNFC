/** 3- or 6-digit hex colour, with or without a leading `#`. */
const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Expand `#abc` -> `#aabbcc`. Returns null when the value isn't a hex colour. */
function normalizeHex(value: string): string | null {
  const match = HEX_RE.exec(value.trim());
  if (!match) return null;
  const digits = match[1];
  if (digits.length === 6) return `#${digits.toLowerCase()}`;
  return `#${digits
    .split('')
    .map((c) => c + c)
    .join('')
    .toLowerCase()}`;
}

/**
 * Coerce an API-supplied colour into a usable CSS hex value.
 * Falls back to `fallback` for anything that isn't a hex colour, so a bad
 * value from the backend can never produce an invalid inline style.
 */
export function safeHex(value: string | null | undefined, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  return normalizeHex(value) ?? fallback;
}

/**
 * Build an `rgba()` string from a hex colour. Used for the translucent
 * background/border tints of a category pill. Returns `fallback` (untouched)
 * when the colour can't be parsed.
 */
export function withAlpha(value: string, alpha: number, fallback: string): string {
  const hex = normalizeHex(value);
  if (!hex) return fallback;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
