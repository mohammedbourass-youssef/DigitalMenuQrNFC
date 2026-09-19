import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  currentStep: 1 | 2;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const { t } = useTranslation();

  const steps = [
    { step: 1, label: t('menuItemForm.steps.basicInfo') },
    { step: 2, label: t('menuItemForm.steps.images') },
  ] as const;

  return (
    <ol className="flex items-center gap-2 sm:gap-4">
      {steps.map(({ step, label }, index) => {
        const completed = currentStep > step;
        const active = currentStep === step;

        return (
          <li key={step} className="flex flex-1 items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <span
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition',
                  completed
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted-foreground/40 text-muted-foreground',
                )}
              >
                {completed ? <Check className="h-4 w-4" /> : step}
              </span>
              <div className="flex flex-col">
                <span
                  className={cn(
                    'text-[11px] font-medium uppercase tracking-wide',
                    active || completed ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {t('menuItemForm.steps.of', { step, total: steps.length })}
                </span>
                <span
                  className={cn(
                    'text-sm font-semibold',
                    active || completed ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
              </div>
            </div>
            {index < steps.length - 1 && (
              <span
                className={cn(
                  'h-px flex-1 rounded-full',
                  completed ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}