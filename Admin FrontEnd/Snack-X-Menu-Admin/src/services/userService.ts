import axiosInstance, { getAuthHeaders } from "@/lib/axios";
import type { MyProfileResponse, UpdateMyProfileDTO } from "@/types";
import type {
  CreateTenantUserRequest,
  CreateTenantUserResponse,
  PagedUserList,
  TenantRole,
  UpdateTenantUserRequest,
  UpdateTenantUserResponse,
  UserListItem,
  UserListRequest,
} from "@/types/user";

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

function normalizeUser(user: UserListItem): UserListItem {
  return {
    ...user,
    fullName: user.fullName ?? "",
    email: user.email ?? "",
    systemRole: user.systemRole ?? "",
    roleNames: Array.isArray(user.roleNames) ? user.roleNames : [],
    lastLoginAt: user.lastLoginAt ?? null,
  };
}

function normalizeUserList(list: unknown): PagedUserList {
  const raw = list as Record<string, unknown>;
  return {
    items: Array.isArray(raw.items) ? raw.items.map(normalizeUser) : [],
    total: Number(raw.total ?? 0),
    page: Number(raw.page ?? 1),
    pageSize: Number(raw.pageSize ?? 10),
    pageCount: Number(raw.pageCount ?? 1),
  };
}

function normalizeTenantRole(role: unknown): TenantRole {
  const raw = role as Record<string, unknown>;
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
  };
}

export const getTenantRoles = async (
  signal?: AbortSignal
): Promise<TenantRole[]> => {
  const { data } = await axiosInstance.get<TenantRole[]>("Users/Roles", {
    headers: getAuthHeaders(),
    signal,
  });

  return Array.isArray(data) ? data.map(normalizeTenantRole) : [];
};

export const createTenantUser = async (
  payload: CreateTenantUserRequest
): Promise<CreateTenantUserResponse> => {
  const { data } = await axiosInstance.post<CreateTenantUserResponse>(
    "Users/Create",
    payload,
    {
      headers: getAuthHeaders(),
    }
  );

  return data;
};

export const getUsers = async (
  request: UserListRequest,
  signal?: AbortSignal
): Promise<PagedUserList> => {
  const params = new URLSearchParams();

  if (request.search?.trim()) {
    params.set("search", request.search.trim());
  }
  if (request.status && request.status !== "all") {
    params.set("status", request.status);
  }
  if (request.verification && request.verification !== "all") {
    params.set("verification", request.verification);
  }
  if (request.sortKey) {
    params.set("sortKey", request.sortKey);
  }
  if (request.sortDirection) {
    params.set("sortDirection", request.sortDirection);
  }

  params.set("page", String(request.page ?? 1));
  params.set("pageSize", String(request.pageSize ?? 10));

  const { data } = await axiosInstance.get<PagedUserList>(
    `Users/List?${params.toString()}`,
    {
      headers: getAuthHeaders(),
      signal,
    }
  );

  return normalizeUserList(data ?? {});
};

export const updateTenantUser = async (
  id: string,
  payload: UpdateTenantUserRequest
): Promise<UpdateTenantUserResponse> => {
  const { data } = await axiosInstance.put<UpdateTenantUserResponse>(
    `Users/${id}`,
    payload,
    {
      headers: getAuthHeaders(),
    }
  );

  return data;
};

export const deleteTenantUser = async (id: string): Promise<void> => {
  await axiosInstance.delete(`Users/${id}`, {
    headers: getAuthHeaders(),
  });
};
