export interface PlanQuotaLimit {
  used: number;
  max: number | null;
  canAdd: boolean;
  display: string;
}

export interface PlanQuota {
  id: number;
  name: string;
  categories: PlanQuotaLimit;
  menuItems: PlanQuotaLimit;
  tables: PlanQuotaLimit;
  users: PlanQuotaLimit;
  maxImagesPerMenuItem: number;
}

export type PlanQuotaResource = 'categories' | 'menuItems' | 'tables' | 'users';
