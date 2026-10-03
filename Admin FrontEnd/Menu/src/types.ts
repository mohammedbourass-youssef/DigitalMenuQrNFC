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
  /**
   * Currency `price` (and `promo.oldPrice`) are denominated in. The menu API
   * converts prices to the requested currency, so this is not necessarily the
   * tenant's billing currency.
   */
  currencyCode?: CurrencyCode;
  /**
   * Cover image followed by the gallery, de-duplicated. See `buildGallery` for
   * why this is derived rather than copied from the DTO. Always an array.
   */
  gallery: string[];
  /** Kitchen prep time; absent when the item does not declare one. */
  preparationTimeMinutes?: number;
  /** Whether the item is promoted as a featured / chef's pick. */
  isFeatured?: boolean;
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
  /**
   * Guid of the selected table, from `GET /api/tenant/Tables`. This is the only
   * table identifier that endpoint returns, so it is what a list selection can
   * supply.
   */
  tableId?: string;
  /** NFC token, present only when the table came from a scanned table URL. */
  tableToken?: string;
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
