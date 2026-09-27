import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { Tenant } from '../types';
import type { CurrencyCode } from '../lib/constants';
import { SUPPORTED_LANGUAGES, isSupportedCurrency } from '../lib/constants';
import { fetchTenantInfo } from '../services/tenantService';
import { TenantNotFoundError } from '../lib/errors';
import { saveSessionId } from '../lib/session';
import { applyTheme, resetTheme } from '../lib/theme';
import { TENANT } from '../lib/tenant';
import { detectDeviceCurrency } from '../lib/detectCurrency';
import { detectDeviceLanguage } from '../lib/detectLanguage';
import { LanguageProvider } from './LanguageContext';
import { SplashScreen } from '../components/SplashScreen';
import { RestaurantNotFound } from '../components/RestaurantNotFound';
import { ErrorScreen } from '../components/ErrorScreen';
import type { TenantInfoResponse } from '../types/tenant';

export type TenantStatus = 'loading' | 'ready' | 'notfound' | 'error';

interface TenantContextValue {
  tenant: Tenant | null;
  status: TenantStatus;
  retry: () => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

/** Build the app Tenant from the loaded tenant-info + device detection. */
function buildTenant(info: TenantInfoResponse): Tenant {
  const configured = (info.defaultCurrency ?? '').trim().toUpperCase();
  let currency: CurrencyCode = detectDeviceCurrency();
  if (isSupportedCurrency(configured)) {
    currency = configured as CurrencyCode;
  } else if (import.meta.env.DEV && configured) {
    console.warn(
      `[tenant] defaultCurrency "${configured}" (from tenant info) is not supported — using detected currency "${currency}".`,
    );
  }
  return {
    slug: TENANT ?? '',
    name: info.restaurantName,
    logoUrl: info.logoUrl ?? '',
    primaryColor: info.primaryColor ?? undefined,
    currency,
    languages: [...SUPPORTED_LANGUAGES],
    defaultLanguage: detectDeviceLanguage(),
    sessionId: info.sessionId,
    restaurantName: info.restaurantName,
    phoneNumber: info.phoneNumber,
    address: info.address,
    defaultCurrency: info.defaultCurrency,
  };
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<TenantStatus>('loading');
  const [tenant, setTenant] = useState<Tenant | null>(null);

  // Guards (refs survive StrictMode's dev double run) so the tenant-info
  // request is made exactly once per app load, yet its result can still be
  // committed after the simulated unmount/remount.
  const startedRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStatus('loading');
    setTenant(null);
    fetchTenantInfo()
      .then((info) => {
        if (!mountedRef.current) return;
        try {
          const resolved = buildTenant(info);
          setTenant(resolved);
          saveSessionId(info.sessionId);
          applyTheme(resolved);
          document.title = info.restaurantName || resolved.name;
          setStatus('ready');
        } catch (err) {
          console.error('[TenantContext] failed to apply tenant info:', err);
          resetTheme();
          if (mountedRef.current) setStatus('error');
        }
      })
      .catch((error: unknown) => {
        if (!mountedRef.current) return;
        console.error('[TenantContext] failed to load tenant info:', error);
        resetTheme();
        setStatus(error instanceof TenantNotFoundError ? 'notfound' : 'error');
      });
  }, [attempt]);

  const retry = useCallback(() => {
    startedRef.current = false;
    setAttempt((n) => n + 1);
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, status, retry }}>
      <LanguageProvider>
        {status === 'loading' && <SplashScreen />}
        {status === 'notfound' && <RestaurantNotFound />}
        {status === 'error' && <ErrorScreen onRetry={retry} />}
        {status === 'ready' && children}
      </LanguageProvider>
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}