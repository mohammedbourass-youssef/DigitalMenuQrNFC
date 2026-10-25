import { useMutation, useQueryClient } from '@tanstack/react-query';

import axiosInstance, { getAuthHeaders } from '@/lib/axios';
import type {
  CreateMenuPayload,
  CreateMenuResponse,
  MainInfoFormValues,
} from '@/types/menuItem';
import { PLAN_QUOTA_QUERY_KEY } from '@/hooks/usePlanQuota';

const toCreateMenuPayload = (values: MainInfoFormValues, categoryId: string): CreateMenuPayload => ({
  name: values.name.trim(),
  description: values.description?.trim() || undefined,
  categoryId,
  priceInDefaultCurrency: values.price,
  defaultCurrencyCode: values.currencyCode.trim().toUpperCase(),
  discountedPrice: values.discountedPrice ?? null,
  displayOrder: values.displayOrder,
  preparationTimeMinutes: values.preparationTime ?? null,
  sku: values.sku?.trim() || undefined,
  isAvailable: values.isAvailable,
  isFeatured: values.isFeatured,
});

const createMainInfo = async (
  payload: CreateMenuPayload
): Promise<CreateMenuResponse> => {
  const response = await axiosInstance.post<CreateMenuResponse>(
    'MenuItems/main',
    payload,
    { headers: getAuthHeaders() }
  );

  const data = response.data;
  const menuId = data?.menuId || (data as unknown as { id?: string })?.id;

  if (!menuId) {
    throw new Error('Could not extract menuId from the server response.');
  }

  return { menuId };
};

export function useCreateMenuItem(categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: MainInfoFormValues) =>
      createMainInfo(toCreateMenuPayload(values, categoryId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PLAN_QUOTA_QUERY_KEY });
    },
  });
}
