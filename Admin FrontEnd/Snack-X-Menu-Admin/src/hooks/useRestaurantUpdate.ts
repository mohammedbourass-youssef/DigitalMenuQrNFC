import { useState } from 'react';
import { updateMyRestaurantInfos } from '@/services/restaurantService';
import type { MyRestaurantUpdateInfosDTO } from '@/types';

interface UseRestaurantUpdateReturn {
  update: (data: MyRestaurantUpdateInfosDTO) => Promise<{ message: string }>;
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

export function useRestaurantUpdate(): UseRestaurantUpdateReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const update = async (data: MyRestaurantUpdateInfosDTO) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await updateMyRestaurantInfos(data);
      setSuccess(result.message);
      return result;
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to update restaurant information';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { update, isLoading, error, success };
}
