export function formatLimit(n: number, unlimitedLabel: string): string {
  if (n === -1) return unlimitedLabel;
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return String(n);
}

export function formatPlanPrice(price: number, currencyCode: string | undefined, locale: string): string {
  if (typeof price !== "number" || !Number.isFinite(price)) return "—";

  // TODO: use the API-provided currency code when available; never assume a default currency.
  if (currencyCode) {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 2,
      }).format(price);
    } catch {
      // Unexpected currency codes degrade to a plain localized amount.
    }
  }

  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(price);
}
