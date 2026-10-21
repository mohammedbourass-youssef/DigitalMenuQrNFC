import { useQuery } from "@tanstack/react-query";

import { getAllPlans } from "@/services/planService";
import type { PaymentType } from "@/types/planPricing";

export function useAllPlans(paymentType: PaymentType) {
  return useQuery({
    queryKey: ["plans-all", paymentType],
    queryFn: () => getAllPlans(paymentType),
    placeholderData: (previousPlans) => previousPlans,
    retry: false,
  });
}
