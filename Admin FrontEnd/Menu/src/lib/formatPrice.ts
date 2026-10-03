import type { CurrencyCode, LanguageCode } from '@/lib/constants';
import { CURRENCY_LABELS } from '@/lib/constants';

/**
 * Format an integer price for display in the currency it is denominated in.
 *
 * The caller must pass the currency that the amount is actually in — that is
 * the DTO's `currencyCode` for menu items, or the cart's own currency. Do not
 * pass the tenant's billing currency as a stand-in: the menu API converts
 * prices to the requested currency, so the two can differ.
 *
 * @param amount   Integer price in the smallest unit of `currency`.
 * @param currency The currency `amount` is denominated in.
 * @param locale   BCP-47 locale code for number formatting.
 */
export function formatPrice(amount: number, currency: CurrencyCode, locale: LanguageCode): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Returns true when the currency prices were actually shown in differs from
 * the one the user asked for, so the UI should say which one was used.
 */
export function needsCurrencyNote(shownCurrency: CurrencyCode, requestedCurrency: CurrencyCode): boolean {
  return shownCurrency !== requestedCurrency;
}

/**
 * Returns a short label for the "prices shown in X" note.
 */
export function currencyNoteLabel(currency: CurrencyCode): string {
  return CURRENCY_LABELS[currency] ?? currency;
}
