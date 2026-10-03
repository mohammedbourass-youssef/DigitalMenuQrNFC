import axios from 'axios';

import i18n from '@/i18n';

interface AxiosLikeError {
  response?: {
    status?: number;
    data?: { error?: string; message?: string };
  };
}

export function readApiError(error: unknown, fallback: string): string {
  const err = error as AxiosLikeError | null;
  const message = err?.response?.data?.error || err?.response?.data?.message;
  return message?.trim() ? message : fallback;
}

export function readErrorStatus(error: unknown): number | null {
  const err = error as AxiosLikeError | null;
  return err?.response?.status ?? null;
}

export function friendlyErrorMessage(error: unknown, fallback?: string): string {
  const t = (key: string): string =>
    i18n.isInitialized ? i18n.t(key) : key;

  if (axios.isCancel(error)) return t('menuItemForm.errors.requestCancelled');

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    if (status === 401) return t('menuItemForm.errors.sessionExpired');
    if (status === 404) return t('menuItemForm.errors.notFound');
    if (status === 500) return t('menuItemForm.errors.serverError');

const data = error.response?.data as
      | {
          error?: string;
          message?: string;
          title?: string;
          errors?: Record<string, string[] | string>;
        }
      | string
      | undefined;

    if (data) {
      if (typeof data === "string" && data.trim()) return data;
      if (typeof data === "object" && data.error?.trim()) return data.error;
      if (typeof data === "object" && data.errors) {
        const first = Object.values(data.errors)[0];
        if (Array.isArray(first) && first[0]?.trim()) return first[0];
        if (typeof first === "string" && first.trim()) return first;
      }
      if (typeof data === "object" && data.message?.trim()) return data.message;
      if (typeof data === "object" && data.title?.trim()) return data.title;
    }
  }

  return fallback ?? t('menuItemForm.errors.generic');
}