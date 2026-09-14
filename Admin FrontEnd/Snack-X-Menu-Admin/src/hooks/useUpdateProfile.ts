import { useState } from 'react';
import { updateMyProfile } from '@/services/userService';
import type { UpdateMyProfileDTO } from '@/types';

interface UseUpdateProfileReturn {
  update: (data: UpdateMyProfileDTO) => Promise<{ message: string }>;
  isLoading: boolean;
  error: string | null;
}

export function useUpdateProfile(): UseUpdateProfileReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (data: UpdateMyProfileDTO) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await updateMyProfile(data);
      return result;
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to update profile';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { update, isLoading, error };
}
