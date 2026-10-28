import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { getMyPermissions } from "@/services/permissionService";

export const MY_PERMISSIONS_QUERY_KEY = ["my-permissions"] as const;

export function useMyPermissions() {
  const { isAuthenticated, isLoading } = useAuth();

  return useQuery({
    queryKey: MY_PERMISSIONS_QUERY_KEY,
    queryFn: ({ signal }) => getMyPermissions(signal),
    enabled: !isLoading && isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
