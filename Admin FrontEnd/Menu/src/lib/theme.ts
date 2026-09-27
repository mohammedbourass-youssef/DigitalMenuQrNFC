import type { Tenant } from '../types';

const HEX_RE = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const DEFAULT_PRIMARY = '#E85D04';
const DEFAULT_PRIMARY_RGB = '232 93 4';
const DEFAULT_ACCENT = '#C44403';
const DEFAULT_ACCENT_RGB = '196 68 3';

function hexToRgbChannels(value: string): string | null {
  let hex = value.trim().replace(/^#/, '');
  if (!HEX_RE.test(hex)) return null;
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return `${parseInt(hex.slice(0, 2), 16)} ${parseInt(hex.slice(2, 4), 16)} ${parseInt(hex.slice(4, 6), 16)}`;
}

/** Pick white or black text that stays readable on the given RGB channels. */
function contrastColor(rgb: string): string {
  const [r, g, b] = rgb.split(' ').map(Number);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 186 ? '#000000' : '#FFFFFF';
}

/** Apply the tenant brand colors to the global CSS variables. */
export function applyTheme(tenant: Tenant): void {
  const root = document.documentElement;
  const primaryRgb = tenant.primaryColor ? hexToRgbChannels(tenant.primaryColor) : null;
  const accentRgb = tenant.accentColor ? hexToRgbChannels(tenant.accentColor) : null;

  root.style.setProperty('--color-primary', tenant.primaryColor ?? DEFAULT_PRIMARY);
  root.style.setProperty('--color-primary-rgb', primaryRgb ?? DEFAULT_PRIMARY_RGB);
  root.style.setProperty('--color-primary-contrast', primaryRgb ? contrastColor(primaryRgb) : '#FFFFFF');
  root.style.setProperty('--color-accent', tenant.accentColor ?? DEFAULT_ACCENT);
  root.style.setProperty('--color-accent-rgb', accentRgb ?? DEFAULT_ACCENT_RGB);

  // Legacy brand vars referenced by inline styles.
  root.style.setProperty('--brand-color', tenant.primaryColor ?? DEFAULT_PRIMARY);
  root.style.setProperty('--brand-color-dark', tenant.accentColor ?? DEFAULT_ACCENT);
  root.style.setProperty(
    '--brand-color-light',
    primaryRgb ? `rgb(${primaryRgb} / 0.1)` : 'rgb(232 93 4 / 0.1)',
  );

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute('content', tenant.primaryColor ?? DEFAULT_PRIMARY);
}

/** Reset the CSS variables back to the default brand palette. */
export function resetTheme(): void {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', DEFAULT_PRIMARY);
  root.style.setProperty('--color-primary-rgb', DEFAULT_PRIMARY_RGB);
  root.style.setProperty('--color-primary-contrast', '#FFFFFF');
  root.style.setProperty('--color-accent', DEFAULT_ACCENT);
  root.style.setProperty('--color-accent-rgb', DEFAULT_ACCENT_RGB);
  root.style.setProperty('--brand-color', DEFAULT_PRIMARY);
  root.style.setProperty('--brand-color-dark', DEFAULT_ACCENT);
  root.style.setProperty('--brand-color-light', 'rgb(232 93 4 / 0.1)');
}