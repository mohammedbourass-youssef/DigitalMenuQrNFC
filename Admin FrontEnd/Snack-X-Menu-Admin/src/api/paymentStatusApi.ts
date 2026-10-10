import axiosInstance from '@/lib/axios';
import type {
  CreatePaymentStatusPayload,
  PaymentStatus,
  PaymentStatusListParams,
  UpdatePaymentStatusPayload,
} from '@/types/paymentStatus';

export interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

const BASE = '/admin/payment-statuses';

export async function getPaymentStatuses(params?: PaymentStatusListParams): Promise<PaymentStatus[]> {
  const response = await axiosInstance.get<PaymentStatus[]>(BASE, {
    params,
  });
  return response.data;
}

export async function getPaymentStatus(id: number): Promise<PaymentStatus> {
  const response = await axiosInstance.get<PaymentStatus>(BASE + '/' + id);
  return response.data;
}

export async function createPaymentStatus(payload: CreatePaymentStatusPayload): Promise<PaymentStatus> {
  const response = await axiosInstance.post<PaymentStatus>(BASE, payload);
  return response.data;
}

export async function updatePaymentStatus(id: number, payload: UpdatePaymentStatusPayload): Promise<PaymentStatus> {
  const response = await axiosInstance.put<PaymentStatus>(BASE + '/' + id, payload);
  return response.data;
}

export async function setPaymentStatusActive(id: number, value: boolean): Promise<void> {
  await axiosInstance.patch(BASE + '/' + id + '/active?value=' + String(value));
}

export async function deletePaymentStatus(id: number): Promise<void> {
  await axiosInstance.delete(BASE + '/' + id);
}