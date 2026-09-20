export interface CategoryOption {
  id: string;
  name: string;
  desc: string;
  color: string;
}

export interface CategoryComboResponse {
  data: CategoryOption[];
}

export interface CreateMenuPayload {
  name: string;
  description?: string;
  categoryId: string;
  priceInDefaultCurrency: number;
  defaultCurrencyCode: string;
  discountedPrice?: number | null;
  displayOrder: number;
  preparationTimeMinutes?: number | null;
  sku?: string;
  isAvailable: boolean;
  isFeatured: boolean;
}

export interface CreateMenuResponse {
  menuId: string;
}

export interface MenuImagesPayload {
  menuId: string;
  coverImage: File;
  images: File[];
}

export interface MainInfoFormValues {
  name: string;
  description: string;
  price: number;
  currencyCode: string;
  discountedPrice?: number;
  displayOrder: number;
  preparationTime?: number;
  sku: string;
  isAvailable: boolean;
  isFeatured: boolean;
}

export interface UploadImagesResponse {
  message?: string;
}

export interface AdminMenuItem {
  id: string;
  categoryId?: string | null;
  isFeatured: boolean;
  name: string | null;
  descriptions: string | null;
  isActive: boolean;
  isAvailable: boolean;
  price: number;
  currency: string;
  discountedPrice: number | null;
  preparationTimeMinutes: number;
  sku: string | null;
  coverImage?: string | null;
  translations?: Array<{ id: string; lang: string; name: string; description?: string }>;
  images?: Array<{ id: string; url: string; displayOrder: number }>;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AdminMenusParams {
  currencyCode: string;
  language: string;
  page?: number;
  pageSize?: number;
}