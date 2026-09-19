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