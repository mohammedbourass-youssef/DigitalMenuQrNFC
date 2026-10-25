import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { PlanQuotaResource } from '@/types/planQuota';
import { usePlanQuota } from '@/hooks/usePlanQuota';

interface QuotaUsageProps {
  resource: PlanQuotaResource;
  showLimitMessage?: boolean;
  label?: string;
  limitMessage?: string;
}

export function QuotaUsage({ resource, showLimitMessage = false, label, limitMessage }: QuotaUsageProps) {
  const { t } = useTranslation();
  const { data: quota } = usePlanQuota();
  const limit = quota?.[resource];
  if (!limit) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600" aria-label={t('planQuota.usage', { defaultValue: 'Usage' })}>
        {label ? `${label} ` : ''}{limit.display}
      </span>
      {showLimitMessage && !limit.canAdd && limit.max !== null && (
        <p className="text-xs text-amber-800" role="status">
          {limitMessage ?? t('planQuota.limitReached', {
            display: limit.display,
            defaultValue: `You reached your limit (${limit.display}).`,
          })}{' '}
          <Link to="/settings/upgrade" className="font-semibold text-[#714B67] underline underline-offset-2">
            {t('planQuota.upgrade', { defaultValue: 'Upgrade your plan' })}
          </Link>
        </p>
      )}
    </div>
  );
}
