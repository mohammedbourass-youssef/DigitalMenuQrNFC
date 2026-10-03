/**
 * Shape of `GET /api/tenant/info?oldSession=`.
 *
 * The response is camelCase (ASP.NET Core MVC default), matching these field
 * names exactly, so no mapping step is needed after parsing.
 */
export interface TenantInfoResponse {
  /**
   * The session token to use from now on.
   *
   * Always authoritative: the server returns the existing token when the
   * `oldSession` it was given is still valid for this restaurant, and a brand
   * new one otherwise (no token, unknown, expired, revoked, or belonging to a
   * different tenant). Callers must overwrite the stored token with this value
   * unconditionally rather than assuming it matches what they sent.
   */
  sessionId: string;
  restaurantName: string;
  logoUrl: string;
  primaryColor: string;
  /**
   * The restaurant's configured currency. The server sends a display value
   * (for example `MAD`), which `normalizeCurrency` maps to an ISO code.
   */
  defaultCurrency: string;
  phoneNumber: string;
  address: string;
}