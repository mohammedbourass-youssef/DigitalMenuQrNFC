export type PaymentType = "Monthly" | "Yearly";

export interface PlanPricing {
  id: number;
  name: string;
  description: string | null;
  isFree: boolean;
  price: number;
  currencyCode?: string;
  yearlySavingsPercent: number | null;
  displayOrder: number;
  isCurrent: boolean;
  canUpgrade: boolean;
  maxUsers: number;
  maxCategories: number;
  maxMenuItems: number;
  maxTables: number;
  maxImagesPerMenuItem: number;
  maxLanguages: number;
  maxRoles: number;
}
