import type { PublicCategory } from './category';

/**
 * A menu item as returned by GET /api/tenant/menu.
 *
 * Mirrors the backend's `MenuItemPublicDTO`. Unlike the legacy `Product` shape
 * the app used previously, the name and description arrive already localised
 * for the requested `lang`, and there is no `categoryId` in the payload — the
 * category is a *request* parameter, so the response is already scoped.
 */
export interface MenuItemPublicDTO {
  /** Guid, as a string. */
  id: string;
  /** Already localised server-side for the requested `lang`. */
  name: string;
  description: string | null;
  price: number;
  /** Set only while a discount is active; higher than `price` when present. */
  originalPrice: number | null;
  currencyCode: string;
  /** Fully resolved URL, or null when the item has no cover image. */
  coverImage: string | null;
  isFeatured: boolean;
  preparationTimeMinutes: number | null;
  /** Fully resolved URLs. May be empty; `coverImage` may be absent from it. */
  images: string[];
}

/** 200 returns this envelope; 204 returns no body at all. */
export interface MenuItemsResponse {
  data: MenuItemPublicDTO[];
}

/**
 * Whether a request is for the whole menu or a single category.
 *
 * `categoryId: null` means "all categories" and sends `getAll=true`; anything
 * else sends `getAll=false` with the id. A null category can therefore never be
 * confused with a missing-but-required one.
 */
export interface MenuScope {
  /** Null for the frontend "All" tab. */
  categoryId: string | null;
}

export type { PublicCategory };

import type { LocalizedString, Product } from '../types';

/**
 * A `LocalizedString` carrying the server's already-localised text.
 *
 * `Product` predates this endpoint and stores names per language, but the DTO
 * resolves language server-side. Filling every key with the same string means
 * `tl()` returns it unchanged for any language, and a language switch refetches
 * rather than re-renders, so the value is never stale.
 */
function asLocalized(value: string): LocalizedString {
  return { en: value, ar: value, fr: value };
}

/**
 * Adapts a DTO to the app's `Product` shape so the existing cart, cart sheet and
 * order payload keep working unchanged.
 *
 * `promo` is derived rather than read, because that is how the cart and detail
 * sheet already detect a discount. A missing description becomes an empty
 * string, since `Product.description` is not nullable.
 */
export function toCartProduct(item: MenuItemPublicDTO): Product {
  const discounted = item.originalPrice !== null && item.originalPrice > item.price;

  return {
    id: item.id,
    name: asLocalized(item.name),
    description: asLocalized(item.description ?? ''),
    price: item.price,
    image: item.coverImage ?? '',
    // The DTO has no categoryId, so this is a non-matching sentinel: the cart
    // never filters by it, and a "See all" view should not be able to match.
    categoryId: '',
    ...(discounted
      ? {
          promo: {
            discountPercent: Math.round(
              (1 - item.price / (item.originalPrice as number)) * 100,
            ),
            oldPrice: item.originalPrice as number,
          },
        }
      : {}),
  };
}
