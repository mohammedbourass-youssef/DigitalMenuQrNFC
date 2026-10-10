export type PaymentStatusLang = string;

export interface PaymentStatusTranslation {
  lang: string;
  name: string;
}

export interface PaymentStatus {
  id: number;
  code: string;
  color: string | null; // hex like "#22C55E"
  displayOrder: number;
  isActive: boolean;
  isSystem: boolean;
  translations: PaymentStatusTranslation[];
}

export interface PaymentStatusListParams {
  includeInactive?: boolean;
}

export interface CreatePaymentStatusPayload {
  code: string;
  color: string | null;
  displayOrder: number;
  isActive: boolean;
  translations: PaymentStatusTranslation[];
}

export interface UpdatePaymentStatusPayload {
  color: string | null;
  displayOrder: number;
  isActive: boolean;
  translations: PaymentStatusTranslation[];
}

export interface ApiErrorResponse {
  message?: string;
  title?: string;
  errors?: Record<string, string[]>;
}
