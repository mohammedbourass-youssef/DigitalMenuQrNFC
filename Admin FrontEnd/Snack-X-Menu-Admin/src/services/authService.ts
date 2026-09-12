import axiosInstance from '@/lib/axios';

import type { LoginDTO, RegisterDTO, UserResponseDto } from '@/types';

export const register = async (data: RegisterDTO): Promise<UserResponseDto> => {
  const formData = new FormData();

  formData.append('fullName', data.fullName);
  formData.append('email', data.email);
  formData.append('PassWord', data.PassWord);
  formData.append('RestaurantName', data.RestaurantName);
  formData.append('BusinesPhoneNumber', data.BusinesPhoneNumber);

  if (data.Logo) {
    formData.append('Logo', data.Logo);
  }

  if (data.PrimaryColor) {
    formData.append('PrimaryColor', data.PrimaryColor);
  }

  if (data.Address) {
    formData.append('Address', data.Address);
  }

  if (data.City) {
    formData.append('City', data.City);
  }

  const response = await axiosInstance.post<UserResponseDto>('/auth/register', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const login = async (data: LoginDTO): Promise<UserResponseDto> => {
  const response = await axiosInstance.post<UserResponseDto>('/auth/login', data);
  return response.data;
};

export const logout = async (): Promise<void> => {
  await axiosInstance.post('/auth/logout');
};

export const getCurrentUser = async (): Promise<UserResponseDto> => {
  const response = await axiosInstance.get<UserResponseDto>('/auth/me');
  return response.data;
};
