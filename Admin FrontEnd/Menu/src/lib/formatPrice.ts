import type { CurrencyCode, LanguageCode } from '@/lib/constants';
import { CURRENCY_LABELS } from '@/lib/constants';

/**
 * Format an integer price for display.
 *
 * Always formats in `tenantCurrency` (the restaurant's actual billing currency).
 * When `displayCurrency` differs from `tenantCurrency`, the output still shows
 * the tenant's currency but the caller should render a "prices shown in X" note.
 *
 * @param amount       Integer price in the tenant's smallest unit.
 * @param tenantCurrency  The restaurant's billing currency.
 * @param displayCurrency The user's chosen display currency (for future use).
 * @param locale           BCP-47 locale code for number formatting.
 */
export function formatPrice(
  amount: number,
  tenantCurrency: CurrencyCode,
  displayCurrency: CurrencyCode,
  locale: LanguageCode,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: tenantCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Returns true when the user's display currency differs from the tenant's
 * actual billing currency, so the UI should show a "prices shown in X" note.
 */
export function needsCurrencyNote(tenantCurrency: CurrencyCode, displayCurrency: CurrencyCode): boolean {
  return tenantCurrency !== displayCurrency;
}

/**
 * Returns a short label for the "prices shown in X" note.
 */
export function currencyNoteLabel(tenantCurrency: CurrencyCode): string {
  return CURRENCY_LABELS[tenantCurrency] ?? tenantCurrency;
}
