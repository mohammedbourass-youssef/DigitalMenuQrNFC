export const CURRENCIES = ['MAD', 'USD', 'EUR', 'JPY', 'KRW', 'CNY', 'GBP'] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY_CODE: string = CURRENCIES[0];