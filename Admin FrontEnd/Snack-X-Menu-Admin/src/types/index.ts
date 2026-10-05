export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  available: boolean;
  image?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  imageUrl?: string;
  displayOrder?: number;
}

export interface AdminCategoryItem {
  id: string;
  name: string | null;
  desc: string | null;
  color: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdminCategoryMeta {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export interface CategoryAdminTranslation {
  id: string;
  lang: string;
  name: string;
  description: string | null;
}

export interface CategoryAdminInfo {
  id: string;
  color: string;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  translations: CategoryAdminTranslation[];
}

export interface AdminCategoryResponse {
  meta: AdminCategoryMeta;
  data: AdminCategoryItem[];
}

export interface CreateCategoryDTO {
  name: string;
  description?: string;
  color?: string;
  image?: File;
  displayOrder?: number;
}

export interface CreateCategoryResponse {
  categoryId: string;
  names: Record<string, string>;
  descriptions: Record<string, string>;
}

export interface UpdateCategoryLanguagesRequest {
  categoryId: string;
  translations: Record<string, { name: string; description?: string }>;
}

export interface UpdateCategoryLanguagesResponse {
  updated: number;
}

export interface NFCTag {
  id: string;
  code: string;
  menuItemId: string;
  status: 'active' | 'inactive';
  location: string;
  lastScannedAt?: string;
}

export interface TableItem {
  id: string;
  number: number;
  name: string;
  isAvailable: boolean;
}

export interface CreateTablePayload {
  number: number;
  name: string;
  isAvailable: boolean;
}

export interface UpdateTablePayload extends CreateTablePayload {
  id: string;
}

export interface OrderStatusItem {
  id: number;
  code: string;
  name: string;
  color: string | null;
  displayOrder: number;
  isFinal: boolean;
  isSystem: boolean;
}

export interface CreateOrderStatusPayload {
  code: string;
  color: string;
  displayOrder: number;
}

export interface UpdateOrderStatusPayload {
  name: string;
  color: string;
  displayOrder: number;
  isFinal: boolean;
}

export interface OrderStatusTranslationEntry {
  lang: string;
  name: string;
}

export interface OrderStatusTranslations {
  statusId: number;
  code: string;
  isSystem: boolean;
  translations: OrderStatusTranslationEntry[];
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  fullName: string;
  email: string;
  PassWord: string;
  RestaurantName: string;
  Logo?: File;
  PrimaryColor?: string;
  BusinesPhoneNumber: string;
  Address?: string;
  City?: string;
}

export interface UserResponseDto {
  id: string;
  tenantId?: string;
  email: string;
  fullName: string;
  role: string;
  restaurantName?: string;
}

export interface AuthState {
  user: UserResponseDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface MyRestaurantUpdateInfosDTO {
  restaurantName: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  currencyCode: string;
  primaryColor?: string;
  logo?: File | null;
}

export interface MyRestaurantInfosResponse {
  restaurantName: string;
  subdomain: string;
  logoUrl: string | null;
  primaryColor: string | null;
  phoneNumber: string | null;
  address: string | null;
  city: string | null;
  status: string;
  currencyCode: string;
  createdAt: string;
  trialEndsAt: string | null;
  isInFreeTrial: boolean;
  subscriptionEndsAt: string | null;
}

export interface MyProfileResponse {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  emailConfirmed: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UpdateMyProfileDTO {
  fullName: string;
}
