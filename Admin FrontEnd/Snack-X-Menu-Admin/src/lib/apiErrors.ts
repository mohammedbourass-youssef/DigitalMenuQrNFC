import axios from 'axios';

import i18n from '@/i18n';

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
      | { error?: string; message?: string; title?: string }
      | string
      | undefined;

    if (data) {
      if (typeof data === 'string' && data.trim()) return data;
      if (typeof data === 'object' && data.error?.trim()) return data.error;
      if (typeof data === 'object' && data.message?.trim()) return data.message;
      if (typeof data === 'object' && data.title?.trim()) return data.title;
    }
  }

  return fallback ?? t('menuItemForm.errors.generic');
}