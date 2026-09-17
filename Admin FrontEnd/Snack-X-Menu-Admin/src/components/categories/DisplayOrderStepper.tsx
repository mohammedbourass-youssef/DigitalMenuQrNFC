import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisplayOrderStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function DisplayOrderStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
}: DisplayOrderStepperProps) {
  const { t } = useTranslation();

  const decrement = () => {
    if (value > min) onChange(value - 1);
  };

  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || value <= min}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors",
            "hover:bg-slate-50 active:bg-slate-100",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
          aria-label={t("categories.displayOrder.decrease")}
        >
          <Minus className="h-4 w-4" />
        </button>

        <div className="flex h-9 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          <span className="text-sm font-semibold text-slate-900 tabular-nums">
            {value}
          </span>
        </div>

        <button
          type="button"
          onClick={increment}
          disabled={disabled || value >= max}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors",
            "hover:bg-slate-50 active:bg-slate-100",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
          aria-label={t("categories.displayOrder.increase")}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-slate-500">
        {t("categories.displayOrder.helper")}
      </p>
    </div>
  );
}
