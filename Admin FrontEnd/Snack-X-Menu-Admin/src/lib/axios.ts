import axios from 'axios';

import { getPreferenceHeaders } from '@/lib/preferences';

export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---- /auth/me guard -------------------------------------------------------
// true  -> /auth/me is allowed
// false -> /auth/me already failed (refresh failed too); don't call it again
// Kept in memory on purpose: a page reload gives the app one fresh attempt.
let meAllowed = true;

export const isMeAllowed = () => meAllowed;
export const resetMeGuard = () => {
  meAllowed = true;
};

const isMeUrl = (url?: string) => !!url && url.includes('/auth/me');

const redirectToLogin = () => {
  // Avoid a reload loop when we're already on the login page
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};
// ---------------------------------------------------------------------------

axiosInstance.interceptors.request.use((config) => {
  // Block /auth/me while the guard is closed
  if (isMeUrl(config.url) && !meAllowed) {
    return Promise.reject(new axios.CanceledError('auth/me blocked after failed refresh'));
  }

  // Never leak these to a third-party host if an absolute URL is ever passed.
  if (config.url && /^https?:\/\//i.test(config.url)) {
    try {
      const base = new URL(axiosInstance.defaults.baseURL ?? '', window.location.origin);
      if (new URL(config.url).origin !== base.origin) return config;
    } catch {
      return config;
    }
  }

  const prefs = getPreferenceHeaders();
  config.headers.set('X-Lang', prefs['X-Lang']);
  config.headers.set('X-Currency', prefs['X-Currency']);
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any) => {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(null)));
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => {
    const url = response.config.url || '';
    // Successful me / login / refresh => session is good, re-open the guard
    if (
      isMeUrl(url) ||
      url.includes('/auth/login') ||
      url.includes('/auth/refresh')
    ) {
      meAllowed = true;
    }
    return response;
  },
  async (error) => {
    // Our own blocked-me cancel, or an error without config: pass through
    if (axios.isCancel(error) || !error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    const url = originalRequest.url || '';

    if (url.includes('/auth/refresh')) {
      meAllowed = false; // refresh failed => stop calling /auth/me
      isRefreshing = false;
      processQueue(error);
      redirectToLogin();
      return Promise.reject(error);
    }

    // Skip interceptor for these endpoints (/auth/me is no longer here)
    if (url.includes('/auth/login') || url.includes('/auth/logout')) {
      return Promise.reject(error);
    }

    // /auth/me failed again after its retry => close the guard
    if (isMeUrl(url) && error.response?.status === 401 && originalRequest._retry) {
      meAllowed = false;
      return Promise.reject(error);
    }

    // For all other 401s (including /auth/me) → try refresh once
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch(err => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        await axiosInstance.post('/auth/refresh', {}, { withCredentials: true });
        meAllowed = true; // correct refresh => re-open the guard
        processQueue(null);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        meAllowed = false;
        processQueue(refreshError);
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;