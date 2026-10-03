import { useLanguage } from '@/contexts/LanguageContext';
import { hapticFeedback } from '@/lib/haptics';
import { OrderStatusIcon } from './OrderStatusIcon';
import { ChevronDown } from 'lucide-react';
import type { OrderTrackingView } from '@/types/order';

/**
 * Persistent "Track my order" bar.
 *
 * Always visible on the menu screen while the session has an order — including
 * after a final status, because the customer still needs to reach the tracking
 * page. Stacked above the cart bar rather than replacing it, so both actions
 * stay available when the cart has items.
 *
 * Reads the same tracking view as the tracking page, so a status change is
 * already reflected here by the time the customer arrives on `/order`.
 */
export function OrderTrackingBar({
  order,
  onClick,
}: {
  order: OrderTrackingView | null;
  onClick: () => void;
}) {
  const { t } = useLanguage();

  // Name and colour both come from the API, already translated server-side.
  const statusName = order ? order.currentStatus.name : null;
  const statusColor = order?.currentStatus.color ?? '#E85D04';

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.8rem)]">
      <button
        type="button"
        onClick={() => {
          hapticFeedback(8);
          onClick();
        }}
        aria-label={t('trackMyOrder')}
        className="flex h-14 w-full max-w-[480px] items-center justify-between gap-3 rounded-2xl bg-white px-4 text-start shadow-panel ring-1 ring-gray-100 transition-transform active:scale-[0.98]"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${statusColor}1A` }}
          >
            <OrderStatusIcon
              code={order?.currentStatus.code ?? 'new'}
              color={statusColor}
              className="h-5 w-5"
            />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-extrabold text-gray-900">
              {t('trackMyOrder')}
            </span>
            <span className="truncate text-xs font-bold" style={{ color: statusColor }}>
              {t('currentStatus')}: {statusName ?? t('loading')}
            </span>
          </span>
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 rotate-180 text-gray-400" />
      </button>
    </div>
  );
}