import axiosInstance, { getAuthHeaders } from "@/lib/axios";
import type { TenantPlanInformations } from "@/types/plan";
import type { PaymentType, PlanPricing } from "@/types/planPricing";

export async function getTenantPlanInformations(): Promise<TenantPlanInformations> {
  const response = await axiosInstance.get<TenantPlanInformations>("/Plans/PlanInformations", {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function getAllPlans(paymentType: PaymentType): Promise<PlanPricing[]> {
  const response = await axiosInstance.get<PlanPricing[]>("/Plans/AllPlans", {
    params: { paymentType },
    headers: getAuthHeaders(),
  });

  return Array.isArray(response.data)
    ? response.data.filter((plan): plan is PlanPricing => typeof plan === "object" && plan !== null)
    : [];
}
