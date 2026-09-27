/**
 * Shape of GET /api/tenant/info.
 *
 * The backend returns PascalCase JSON (SessionId, RestaurantName, ...).
 * src/services/tenantService.ts maps those PascalCase fields to this
 * camelCase shape right after JSON parsing (a small mapping step), matching
 * the existing fetch wrapper's behavior of parsing the body as-is.
 */
export interface TenantInfoResponse {
  sessionId: string;
  restaurantName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  defaultCurrency: string;
  phoneNumber: string | null;
  address: string | null;
}