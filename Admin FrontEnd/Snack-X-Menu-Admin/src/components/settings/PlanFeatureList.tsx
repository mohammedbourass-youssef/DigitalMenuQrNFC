import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatLimit } from "@/lib/planPricingUtils";
import type { PlanPricing } from "@/types/planPricing";

export function PlanFeatureList({ plan }: { plan: PlanPricing }) {
  const { t } = useTranslation();
  const features: Array<[string, number]> = [
    ["users", plan.maxUsers],
    ["categories", plan.maxCategories],
    ["menuItems", plan.maxMenuItems],
    ["tables", plan.maxTables],
    ["imagesPerMenuItem", plan.maxImagesPerMenuItem],
    ["languages", plan.maxLanguages],
  ];

  return (
    <ul className="space-y-2.5 text-sm text-slate-600">
      {features.map(([key, value]) => (
        <li key={key} className="flex items-start gap-2">
          <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#017E84]" />
          <span>{t(`settings.upgrade.features.${key}`, { count: formatLimit(value, t("settings.upgrade.unlimited")) })}</span>
        </li>
      ))}
    </ul>
  );
}
