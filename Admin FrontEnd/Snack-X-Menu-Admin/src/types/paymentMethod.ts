/**
 * Models for the tenant payment-methods feature.
 * Mirrors `PaymentMethodsController` / `IPaymentMethodsRepo` on the backend.
 */

/** One row of the global catalog, for the "Add payment method" dropdown. */
export interface SystemPaymentMethod {
  id: number;
  code: string;
  /** Translated catalog name for the request language (never hardcoded here). */
  name: string;
  description?: string | null;
  color?: string | null;
  /** Opaque icon name from the API, e.g. `banknote`, `credit-card`, `landmark`. */
  icon?: string | null;
  alreadyAdded: boolean;
}

/** One of the tenant's own methods - use `id` for every action. */
export interface TenantPaymentMethod {
  id: number;
  /** Only used when adding; never send it to an action route. */
  paymentMethodId: number;
  code: string;
  /** Translated catalog name. */
  systemName: string;
  /** Tenant's custom label, when set. */
  displayName?: string | null;
  /** Effective label = `displayName` ?? `systemName`. Always display this. */
  label: string;
  color?: string | null;
  icon?: string | null;
  isEnabled: boolean;
  isDefault: boolean;
  displayOrder: number;
}

export interface AddPaymentMethodPayload {
  paymentMethodId: number;
  displayName?: string;
  isEnabled: boolean;
  isDefault: boolean;
}

export interface UpdatePaymentMethodPayload {
  displayName?: string;
  isEnabled: boolean;
}

export interface SetEnabledPayload {
  isEnabled: boolean;
}

export interface ReorderPaymentMethodsPayload {
  orderedIds: number[];
}

/** Error codes sent by the backend in `{ code, error }`. */
export type PaymentMethodErrorCode =
  | "DUPLICATE"
  | "LAST_ENABLED"
  | "INVALID_SYSTEM_METHOD"
  | "INVALID_ORDER"
  | "NOT_FOUND";