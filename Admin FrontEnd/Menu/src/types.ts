export type Language = 'ar' | 'fr' | 'en';

export type Direction = 'ltr' | 'rtl';

export interface LocalizedString {
  ar: string;
  fr: string;
  en: string;
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

export type UIStrings = Record<string, LocalizedString>;
