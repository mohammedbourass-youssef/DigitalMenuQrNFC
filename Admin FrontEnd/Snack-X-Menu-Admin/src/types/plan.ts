export type BillingCycle = "Monthly" | "Yearly" | 0 | 1 | 2 | number;

export interface TenantPlanInformations {
  tenantId: string;
  tenantName: string;
  planName: string;
  description: string | null;
  isFree: boolean;
  billingCycle: BillingCycle;
  usedUsersFromTotal: string;
  usedCategoriesFromTotal: string;
  usedMenuItemsFromTotal: string;
  usedTablesFromTotal: string;
  maxImagesPerMenu: number;
  usedLanguagesTotal: string;
  startAtUTC: string | null;
  expiresATutc: string | null;
}
