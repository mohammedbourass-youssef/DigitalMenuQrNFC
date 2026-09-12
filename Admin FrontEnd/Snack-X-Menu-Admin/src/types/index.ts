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
}

export interface NFCTag {
  id: string;
  code: string;
  menuItemId: string;
  status: 'active' | 'inactive';
  location: string;
  lastScannedAt?: string;
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
