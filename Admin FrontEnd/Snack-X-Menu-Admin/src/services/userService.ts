import axiosInstance from '@/lib/axios';
import type { MyProfileResponse, UpdateMyProfileDTO } from '@/types';

export interface VerificationResponse {
  message: string;
}

export interface VerificationError {
  error: string;
}

export const getMyProfile = async (): Promise<MyProfileResponse> => {
  console.log('🔵 [userService] getMyProfile → calling GET /users/my-profile');
  
  try {
    const response = await axiosInstance.get<MyProfileResponse>('/users/my-profile');
    
    console.log('✅ [userService] getMyProfile → success');
    console.log('   status:', response.status);
    console.log('   headers:', response.headers);
    console.log('   data:', response.data);
    
    return response.data;
  } catch (error: any) {
    console.error('❌ [userService] getMyProfile → failed');
    console.error('   status:', error?.response?.status);
    console.error('   statusText:', error?.response?.statusText);
    console.error('   error data:', error?.response?.data);
    console.error('   message:', error?.message);
    throw error;
  }
};

export const updateMyProfile = async (
  data: UpdateMyProfileDTO
): Promise<{ message: string }> => {
  console.log('🔵 [userService] updateMyProfile → calling PUT /users/my-profile');
  console.log('   payload:', data);

  try {
    const response = await axiosInstance.put<{ message: string }>('/users/my-profile', data);

    console.log('✅ [userService] updateMyProfile → success');
    console.log('   status:', response.status);
    console.log('   data:', response.data);

    return response.data;
  } catch (error: any) {
    console.error('❌ [userService] updateMyProfile → failed');
    console.error('   status:', error?.response?.status);
    console.error('   statusText:', error?.response?.statusText);
    console.error('   error data:', error?.response?.data);
    console.error('   message:', error?.message);
    throw error;
  }
};

export const requestVerification =
  async (): Promise<VerificationResponse> => {
    const response =
      await axiosInstance.post<VerificationResponse>(
        "/users/request-verification"
      );
    return response.data;
  };

export const verifyEmail = async (
  code: number
): Promise<VerificationResponse> => {
  const response =
    await axiosInstance.post<VerificationResponse>(
      "/users/verify-email",
      code
    );
  return response.data;
};
