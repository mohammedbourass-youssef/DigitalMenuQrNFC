import axiosInstance from '@/lib/axios';
import type { MyRestaurantInfosResponse, MyRestaurantUpdateInfosDTO } from '@/types';

export const getMyRestaurantInfos = async (): Promise<MyRestaurantInfosResponse> => {
  const response = await axiosInstance.get<MyRestaurantInfosResponse>('Restaurants/my-restaurant');
  return response.data;
};

export const updateMyRestaurantInfos = async (
  data: MyRestaurantUpdateInfosDTO
): Promise<{ message: string }> => {
  const formData = new FormData();
  formData.append('restaurantName', data.restaurantName);
  if (data.phoneNumber) formData.append('phoneNumber', data.phoneNumber);
  if (data.address) formData.append('address', data.address);
  if (data.city) formData.append('city', data.city);
  formData.append('currencyCode', data.currencyCode);
  if (data.primaryColor) formData.append('primaryColor', data.primaryColor);
  if (data.logo) formData.append('logo', data.logo);

  const response = await axiosInstance.put(
    '/Restaurants/infos-update',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};
