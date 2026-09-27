import type { CreateOrderPayload, Language, OrderResult, TableInfo, Tenant } from '../types';
import type { TenantInfoResponse } from '../types/tenant';
import type { PublicCategory } from '../types/category';
import type { MenuItemPublicDTO } from '../types/menuItem';
import { categories as mockCategories, products as mockProducts } from '../data';
import { ApiError, InvalidTableError, TenantNotFoundError } from './errors';
import { TENANT } from './tenant';
import { DEFAULT_CURRENCY } from './constants';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function createSessionId(): string | null {
  try {
    return crypto.randomUUID();
  } catch {
    return null;
  }
}

export const mockTenants: Record<string, Tenant> = {
  pizza: {
    slug: 'pizza',
    name: 'Snack X',
    logoUrl: '',
    primaryColor: '#E85D04',
    accentColor: '#C44403',
    currency: 'MAD',
    languages: ['ar', 'fr', 'en'],
    defaultLanguage: 'en',
  },
  cafe: {
    slug: 'cafe',
    name: 'Café Nuno',
    logoUrl: '',
    primaryColor: '#0F766E',
    accentColor: '#0B5A54',
    currency: 'MAD',
    languages: ['ar', 'fr', 'en'],
    defaultLanguage: 'ar',
  },
};

const mockTables: Record<string, TableInfo> = {
  abc123: { tableId: 'mock-1', number: 12, tenantSlug: 'pizza' },
  'cafe-5': { tableId: 'mock-cafe-5', number: 5, tenantSlug: 'cafe' },
};

export async function mockGetTenant(slug: string): Promise<Tenant> {
  await delay(300);
  const tenant = mockTenants[slug];
  if (!tenant) throw new TenantNotFoundError();
  return tenant;
}

export async function mockGetTenantInfo(): Promise<TenantInfoResponse> {
  await delay(300);
  const tenant = TENANT ? mockTenants[TENANT] : undefined;
  if (!tenant) throw new TenantNotFoundError();
  return {
    sessionId: createSessionId() ?? `${tenant.slug}_local`,
    restaurantName: tenant.name,
    logoUrl: null,
    primaryColor: tenant.primaryColor ?? null,
    defaultCurrency: tenant.currency ?? DEFAULT_CURRENCY,
    phoneNumber: null,
    address: null,
  };
}

export async function mockGetTable(token: string): Promise<TableInfo> {
  await delay(300);
  const table = mockTables[token];
  if (!table) throw new InvalidTableError();
  return table;
}

/**
 * Mock counterpart of the public menu endpoint.
 *
 * The legacy `mockProducts` shape is adapted here rather than in the store, so
 * the components only ever see the DTO the real endpoint returns.
 */
export async function mockGetMenuItems(
  lang: Language,
  { categoryId }: { categoryId: string | null },
): Promise<MenuItemPublicDTO[]> {
  await delay(300);
  const scoped = categoryId
    ? mockProducts.filter((product) => product.categoryId === categoryId)
    : mockProducts;

  return scoped.map((product) => {
    const promo = product.promo;
    const displayPrice = promo
      ? promo.oldPrice * (1 - promo.discountPercent / 100)
      : product.price;

    return {
      id: product.id,
      name: product.name[lang] ?? product.name.en,
      description: product.description[lang] ?? product.description.en,
      price: displayPrice,
      originalPrice: promo ? promo.oldPrice : null,
      currencyCode: 'MAD',
      coverImage: product.image || null,
      isFeatured: Boolean(promo),
      preparationTimeMinutes: null,
      images: product.image ? [product.image] : [],
    };
  });
}

/** Stand-in accents for mock categories, which carry no colour of their own. */
const MOCK_CATEGORY_COLORS = ['#FF6B35', '#2E86AB', '#2CA02C', '#9467BD', '#D62728', '#8C564B'];

export async function mockGetCategories(lang: Language): Promise<PublicCategory[]> {
  await delay(300);
  return mockCategories
    // The real API has no synthetic "promos" category — drop it so mock mode
    // doesn't surface a tab with no products behind it.
    .filter((c) => c.id !== 'promos')
    .map((c, i) => ({
      id: c.id,
      name: c.name[lang] ?? c.name.en,
      desc: '',
      color: MOCK_CATEGORY_COLORS[i % MOCK_CATEGORY_COLORS.length],
      image: '',
    }));
}

export async function mockCreateOrder(payload: CreateOrderPayload): Promise<OrderResult> {
  await delay(700);
  if (payload.items.length === 0) throw new ApiError(422, 'Empty order', 'empty_order');
  const knownIds = new Set(mockProducts.map((p) => p.id));
  for (const item of payload.items) {
    if (item.quantity < 1) throw new ApiError(422, 'Invalid quantity', 'invalid_quantity');
    if (!knownIds.has(item.productId)) throw new ApiError(409, 'Product unavailable', 'product_unavailable');
  }
  return {
    id: `order_${payload.idempotencyKey.slice(0, 8)}`,
    number: String(100 + Math.floor(Math.random() * 900)),
  };
}