import axiosInstance, { getAuthHeaders } from "@/lib/axios";
import type { MyPermissionsResponse } from "@/types/permissions";

export async function getMyPermissions(signal?: AbortSignal): Promise<MyPermissionsResponse> {
  const response = await axiosInstance.get<MyPermissionsResponse>("/permissions/me", {
    headers: getAuthHeaders(),
    signal,
  });

  return response.data;
}
