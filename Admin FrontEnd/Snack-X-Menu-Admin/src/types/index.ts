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
  status: "active" | "inactive";
  location: string;
  lastScannedAt?: string;
}
