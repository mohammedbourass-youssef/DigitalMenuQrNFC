import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import axiosInstance, { getAuthHeaders } from '@/lib/axios';
import type { MenuImagesPayload, UploadImagesResponse } from '@/types/menuItem';

const uploadMenuImages = async (
  payload: MenuImagesPayload,
  onProgress: (percent: number) => void
): Promise<UploadImagesResponse> => {
  const formData = new FormData();

  formData.append('coverImage', payload.coverImage);

  // Additional images — empty array is safe, just sends coverImage only
  payload.images.forEach((file) => {
    formData.append('images', file);
  });

  const { Authorization } = getAuthHeaders();

  const response = await axiosInstance.put<UploadImagesResponse>(
    `MenuItems/${payload.menuId}/Images`,
    formData,
    {
      // Override the instance default (application/json) so the browser
      // sends multipart/form-data with the boundary for this FormData body.
      headers: { Authorization, 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (event.total) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      },
    }
  );

  return response.data;  // ✅ let it throw if undefined
};

export function useUploadMenuImages() {
  const [progress, setProgress] = useState<number>(0);

  const mutation = useMutation<UploadImagesResponse, Error, MenuImagesPayload>({
    mutationFn: (payload) => uploadMenuImages(payload, setProgress),
    onSuccess: () => setProgress(100),   // ✅ explicit 100% on done
    onSettled: () => {
      // Reset after short delay so UI shows 100% briefly before clearing
      setTimeout(() => setProgress(0), 500);
    },
  });

  return { ...mutation, progress };
}