import axios from 'axios';

export interface OrderHistoryRange {
  from: number;
  to: number;
}

export function getOrderHistoryRange(
  page: number,
  pageSize: number,
  itemCount: number,
  totalCount: number,
): OrderHistoryRange {
  if (totalCount === 0 || itemCount === 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  return { from, to: from + itemCount - 1 };
}

export function isUnauthorizedOrderHistoryError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export function getOrderHistoryErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string; message?: string }>(error)) {
    return error.response?.data?.error ?? error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : 'Unable to load order history';
}
