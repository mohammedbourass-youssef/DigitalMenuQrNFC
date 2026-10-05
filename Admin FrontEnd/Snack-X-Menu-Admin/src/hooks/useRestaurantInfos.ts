import { useEffect, useState, useCallback } from 'react';
import { getMyRestaurantInfos } from '@/services/restaurantService';
import { hasStoredCurrency, isSupportedCurrency, setCurrency } from '@/lib/preferences';
import type { MyRestaurantInfosResponse } from '@/types';

interface UseRestaurantInfosReturn {
  data: MyRestaurantInfosResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRestaurantInfos(): UseRestaurantInfosReturn {
  const [data, setData] = useState<MyRestaurantInfosResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getMyRestaurantInfos();
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load restaurant info');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Seed the X-Currency preference from the restaurant account (once), so every
  // later request is converted to the currency this tenant actually uses.
  // An unsupported code is ignored rather than persisted as the fallback,
  // otherwise the default would be frozen into storage and never re-evaluated.
  useEffect(() => {
    const code = data?.currencyCode?.trim();
    if (code && !hasStoredCurrency() && isSupportedCurrency(code)) {
      setCurrency(code);
    }
  }, [data]);

  return { data, isLoading, error, refetch: fetchData };
}
