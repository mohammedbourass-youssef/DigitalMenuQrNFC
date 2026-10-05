import axiosInstance from "@/lib/axios";
import type {
  AddPaymentMethodPayload,
  PaymentMethodErrorCode,
  ReorderPaymentMethodsPayload,
  SetEnabledPayload,
  SystemPaymentMethod,
  TenantPaymentMethod,
  UpdatePaymentMethodPayload,
} from "@/types/paymentMethod";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

// The language is picked up from the X-Lang header by the axios interceptor,
// which is what `ILanguageAccessor` reads on the backend.

/** Catalog for the "Add payment method" dropdown (TenantOwner only). */
export const getSystemPaymentMethods = async (): Promise<SystemPaymentMethod[]> => {
  const { data } = await axiosInstance.get<SystemPaymentMethod[]>("PaymentMethods/System");
  return data;
};

/** The tenant's own methods, enabled and disabled, in display order. */
export const getTenantPaymentMethods = async (): Promise<TenantPaymentMethod[]> => {
  const { data } = await axiosInstance.get<TenantPaymentMethod[]>("PaymentMethods");
  return data;
};

export const getTenantPaymentMethod = async (id: number): Promise<TenantPaymentMethod> => {
  const { data } = await axiosInstance.get<TenantPaymentMethod>(`PaymentMethods/${id}`);
  return data;
};

/** Enabled methods only, for the cashier / payment screen. Any tenant user. */
export const getEnabledPaymentMethods = async (): Promise<TenantPaymentMethod[]> => {
  const { data } = await axiosInstance.get<TenantPaymentMethod[]>("PaymentMethods/Enabled");
  return data;
};

export const addPaymentMethod = async (
  payload: AddPaymentMethodPayload
): Promise<TenantPaymentMethod> => {
  const { data } = await axiosInstance.post<TenantPaymentMethod>("PaymentMethods", payload, {
    headers: JSON_HEADERS,
  });
  return data;
};

export const updatePaymentMethod = async (
  id: number,
  payload: UpdatePaymentMethodPayload
): Promise<void> => {
  await axiosInstance.put(`PaymentMethods/${id}`, payload, { headers: JSON_HEADERS });
};

export const setPaymentMethodEnabled = async (
  id: number,
  payload: SetEnabledPayload
): Promise<void> => {
  await axiosInstance.patch(`PaymentMethods/${id}/enabled`, payload, { headers: JSON_HEADERS });
};

/** Makes this method the default; the backend unsets the previous one. */
export const setPaymentMethodDefault = async (id: number): Promise<void> => {
  await axiosInstance.patch(`PaymentMethods/${id}/default`, undefined, {
    headers: JSON_HEADERS,
  });
};

/** `orderedIds` must contain every tenant method id, in the new order. */
export const reorderPaymentMethods = async (
  payload: ReorderPaymentMethodsPayload
): Promise<void> => {
  await axiosInstance.put("PaymentMethods/reorder", payload, { headers: JSON_HEADERS });
};

export const deletePaymentMethod = async (id: number): Promise<void> => {
  await axiosInstance.delete(`PaymentMethods/${id}`);
};

const ERROR_CODES: readonly string[] = [
  "DUPLICATE",
  "LAST_ENABLED",
  "INVALID_SYSTEM_METHOD",
  "INVALID_ORDER",
  "NOT_FOUND",
];

/** Reads the `{ code, error }` body the backend returns for 4xx responses. */
export function readPaymentMethodErrorCode(error: unknown): PaymentMethodErrorCode | null {
  const data = (error as { response?: { data?: { code?: unknown } } } | null)?.response?.data;
  const code = data?.code;
  return typeof code === "string" && ERROR_CODES.includes(code)
    ? (code as PaymentMethodErrorCode)
    : null;
}

/**
 * Maps an error to the i18n key that explains it. Returns `null` when the
 * backend sent nothing actionable, so callers fall back to `readApiError`.
 */
export function paymentMethodErrorKey(
  error: unknown
): string | null {
  switch (readPaymentMethodErrorCode(error)) {
    case "DUPLICATE":
      return "paymentsMethods.errors.duplicate";
    case "LAST_ENABLED":
      return "paymentsMethods.errors.lastEnabled";
    case "INVALID_SYSTEM_METHOD":
      return "paymentsMethods.errors.invalidSystemMethod";
    case "INVALID_ORDER":
      return "paymentsMethods.errors.invalidOrder";
    case "NOT_FOUND":
      return "paymentsMethods.errors.notFound";
    default:
      return null;
  }
}