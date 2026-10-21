import { useQuery } from "@tanstack/react-query";
import { getTenantPlanInformations } from "@/services/planService";

export const TENANT_PLAN_INFORMATIONS_QUERY_KEY = ["tenant-plan-informations"] as const;

export function useTenantPlanInformations() {
  return useQuery({
    queryKey: TENANT_PLAN_INFORMATIONS_QUERY_KEY,
    queryFn: getTenantPlanInformations,
    retry: false,
  });
}
