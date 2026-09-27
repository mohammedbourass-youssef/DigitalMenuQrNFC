import type { CurrencyCode, LanguageCode } from './lib/constants';

export type Language = LanguageCode;

export type Direction = 'ltr' | 'rtl';

export interface LocalizedString extends Partial<Record<LanguageCode, string>> {
  en: string;
  ar: string;
  fr: string;
}

export interface Product {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  price: number;
  image: string;
  categoryId: string;
  promo?: {
    discountPercent: number;
    oldPrice: number;
  };
}

export interface Category {
  id: string;
  name: LocalizedString;
  icon: string;
}

export interface Restaurant {
  id: string;
  name: LocalizedString;
  logo: string;
  accentColor: string;
  tagline: LocalizedString;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

/** A restaurant tenant, resolved from the hostname. */
export interface Tenant {
  slug: string;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  currency: CurrencyCode;
  languages: LanguageCode[];
  defaultLanguage: LanguageCode;
  /** Tenant session id from GET /api/tenant/info (may be empty until resolved). */
  sessionId?: string;
  restaurantName?: string;
  phoneNumber?: string | null;
  address?: string | null;
  defaultCurrency?: string;
}

/** A validated NFC/QR table tag. */
export interface TableInfo {
  tableId: string;
  number: number;
  tenantSlug: string;
}

export interface OrderLineItem {
  productId: string;
  quantity: number;
}

export interface CreateOrderPayload {
  tableToken: string;
  items: OrderLineItem[];
  note?: string;
  idempotencyKey: string;
}

export interface OrderResult {
  id: string;
  number: string;
}

export interface MenuData {
  categories: Category[];
  products: Product[];
}

export type UIStrings = Record<string, LocalizedString>;
