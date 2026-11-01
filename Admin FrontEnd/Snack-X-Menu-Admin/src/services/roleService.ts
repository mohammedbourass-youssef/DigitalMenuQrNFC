import axiosInstance, { getAuthHeaders } from "@/lib/axios";
import type {
  CreateRoleRequest,
  CreateRoleResponse,
  RoleItem,
  RoleMutationResponse,
  UpdateRolePayload,
} from "@/types/role";

export type { RoleMutationResponse };

export interface BulkDeleteRolesResult {
  deleted: number;
  failed: unknown[];
}

function normalizeRole(role: RoleItem): RoleItem {
  return {
    ...role,
    description: role.description ?? "",
    rolePermissions: Array.isArray(role.rolePermissions) ? role.rolePermissions : [],
  };
}

export const getRoles = async (signal?: AbortSignal): Promise<RoleItem[]> => {
  const { data } = await axiosInstance.get<RoleItem[]>("Roles/List", {
    headers: getAuthHeaders(),
    signal,
  });

  return Array.isArray(data) ? data.map(normalizeRole) : [];
};

export const createRole = async (
  payload: CreateRoleRequest
): Promise<CreateRoleResponse> => {
  const { data } = await axiosInstance.post<CreateRoleResponse>("Roles/Create", payload, {
    headers: getAuthHeaders(),
  });
  return data;
};

export const updateRole = async (payload: UpdateRolePayload): Promise<void> => {
  await axiosInstance.put("Roles", payload, {
    headers: getAuthHeaders(),
  });
};

export const deleteRole = async (id: string): Promise<RoleMutationResponse> => {
  const { data } = await axiosInstance.delete<RoleMutationResponse>(`Roles/${id}`, {
    headers: getAuthHeaders(),
  });
  return data;
};

export const deleteRoles = async (ids: string[]): Promise<BulkDeleteRolesResult> => {
  const results = await Promise.allSettled(ids.map((id) => deleteRole(id)));
  const failed = results.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : []
  );

  return { deleted: ids.length - failed.length, failed };
};
