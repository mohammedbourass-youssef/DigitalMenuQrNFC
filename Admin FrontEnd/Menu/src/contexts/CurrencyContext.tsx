import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { CurrencyCode } from '@/lib/constants';
import { isSupportedCurrency } from '@/lib/constants';
import { storageGet, storageSet } from '@/lib/storage';
import { tenantScopedKey } from '@/lib/tenant';
import { useTenant } from '@/contexts/TenantContext';

export interface CurrencyContextValue {
  tenantCurrency: CurrencyCode;
  displayCurrency: CurrencyCode;
  setDisplayCurrency: (code: CurrencyCode) => void;
  currency: CurrencyCode;
}

const STORAGE_KEY = 'currency-pref';

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readPersistedCurrency(tenantCurrency: CurrencyCode): CurrencyCode {
  const raw = storageGet<string | null>(tenantScopedKey(STORAGE_KEY), null);
  if (raw && isSupportedCurrency(raw)) return raw;
  return tenantCurrency;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenant();
  const tenantCurrency: CurrencyCode = tenant?.currency ?? 'MAD';

  const [displayCurrency, setDisplayCurrencyState] = useState<CurrencyCode>(() =>
    readPersistedCurrency(tenantCurrency),
  );

  const setDisplayCurrency = useCallback(
    (code: CurrencyCode) => {
      setDisplayCurrencyState(code);
      storageSet(tenantScopedKey(STORAGE_KEY), code);
    },
    [],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      tenantCurrency,
      displayCurrency,
      setDisplayCurrency,
      currency: displayCurrency,
    }),
    [tenantCurrency, displayCurrency, setDisplayCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
