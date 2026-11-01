import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createRole, deleteRole, deleteRoles, getRoles, updateRole } from "@/services/roleService";
import { PLAN_QUOTA_QUERY_KEY } from "@/hooks/usePlanQuota";
import { TENANT_PLAN_INFORMATIONS_QUERY_KEY } from "@/hooks/useTenantPlanInformations";

export const rolesQueryKey = ["admin-roles"] as const;

function useInvalidateRoleScope() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: rolesQueryKey }),
      queryClient.invalidateQueries({ queryKey: PLAN_QUOTA_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: TENANT_PLAN_INFORMATIONS_QUERY_KEY }),
    ]);
  };
}

export function useRoles(enabled = true) {
  return useQuery({
    queryKey: rolesQueryKey,
    queryFn: ({ signal }) => getRoles(signal),
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useCreateRole() {
  const invalidate = useInvalidateRoleScope();

  return useMutation({
    mutationFn: createRole,
    onSuccess: invalidate,
  });
}

export function useUpdateRole() {
  const invalidate = useInvalidateRoleScope();

  return useMutation({
    mutationFn: updateRole,
    onSuccess: invalidate,
  });
}

export function useDeleteRole() {
  const invalidate = useInvalidateRoleScope();

  return useMutation({
    mutationFn: deleteRole,
    onSuccess: invalidate,
  });
}

export function useDeleteRoles() {
  const invalidate = useInvalidateRoleScope();

  return useMutation({
    mutationFn: deleteRoles,
    onSuccess: invalidate,
  });
}
