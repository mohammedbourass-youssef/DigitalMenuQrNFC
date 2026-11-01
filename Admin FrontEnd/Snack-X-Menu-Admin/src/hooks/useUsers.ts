import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createTenantUser,
  getTenantRoles,
  getUsers,
} from "@/services/userService";
import type { CreateTenantUserRequest } from "@/types/user";
import type { UserListRequest } from "@/types/user";

export const usersQueryKey = ["admin-users"] as const;
export const tenantRolesQueryKey = ["admin-tenant-roles"] as const;

export function useUsers(request: UserListRequest, enabled = true) {
  const queryKey = useMemo(
    () => [
      ...usersQueryKey,
      request.search ?? "",
      request.status ?? "all",
      request.verification ?? "all",
      request.sortKey ?? "name",
      request.sortDirection ?? "asc",
      request.page ?? 1,
      request.pageSize ?? 10,
    ],
    [
      request.search,
      request.status,
      request.verification,
      request.sortKey,
      request.sortDirection,
      request.page,
      request.pageSize,
    ]
  );

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => getUsers(request, signal),
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useTenantRoles(enabled = true) {
  return useQuery({
    queryKey: tenantRolesQueryKey,
    queryFn: ({ signal }) => getTenantRoles(signal),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useCreateTenantUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTenantUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
      queryClient.invalidateQueries({ queryKey: tenantRolesQueryKey });
    },
  });
}

export type { CreateTenantUserRequest };
