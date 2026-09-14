import { useEffect, useState, useCallback } from 'react';
import { getMyProfile } from '@/services/userService';
import type { MyProfileResponse } from '@/types';

interface UseMyProfileReturn {
  data: MyProfileResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMyProfile(): UseMyProfileReturn {
  const [data, setData] = useState<MyProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getMyProfile();
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
