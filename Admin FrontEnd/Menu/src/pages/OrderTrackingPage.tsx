import { useCallback, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { STATUS_BANNER_MS, useSessionOrder } from '@/contexts/SessionOrderContext';
import { navigate } from '@/lib/router';
import { hapticFeedback } from '@/lib/haptics';
import { OrderStatusIcon } from '@/components/OrderStatusIcon';
import { OrderStepper } from '@/components/OrderStepper';
import { OrderSummaryCard } from '@/components/OrderSummaryCard';
import { OrderStatusBanner } from '@/components/OrderStatusBanner';
import { formatTime } from '@/utils/dateTime';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import type { CurrencyCode } from '@/lib/constants';
import type { OrderTrackingView } from '@/types/order';

/** Distance the content must travel before a pull is treated as intentional. */
const PULL_THRESHOLD_PX = 72;
/** Resistance applied while dragging past the threshold. */
const PULL_MAX_PX = 112;

/**
 * Order tracking screen (`/order`).
 *
 * There is deliberately no "new order" action anywhere on this page: a session
 * has at most one order, and once it exists the only way to order more is to
 * add items to it.
 */
export function OrderTrackingPage() {
  const { t, lang, dir } = useLanguage();
  const {
    tracking,
    isLoading,
    isRefreshing,
    error,
    refetch,
    isFinal,
    canAddItems,
  } = useSessionOrder();

  const pull = usePullToRefresh(refetch);

  /* --- Loading skeleton -------------------------------------------------- */
  if (isLoading && !tracking) {
    return (
      <div className="sheet-scroll flex h-full flex-col overflow-y-auto bg-gray-50">
        <SkeletonHeader dir={dir} onBack={() => navigate('/')} />
        <div className="space-y-3 px-4 pb-8">
          <div className="h-36 rounded-3xl skeleton" />
          <div className="h-48 rounded-3xl skeleton" />
          <div className="h-40 rounded-3xl skeleton" />
        </div>
      </div>
    );
  }

  /* --- Error with retry ------------------------------------------------- */
  if (error && !tracking) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-gray-50 px-8 text-center">
        <h1 className="text-xl font-extrabold text-gray-900">{t('orderLoadFailed')}</h1>
        <p className="text-sm font-medium text-gray-500">{t('orderLoadFailedHint')}</p>
        <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-sm font-extrabold text-white active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" />
            {t('retry')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex h-13 items-center justify-center rounded-2xl bg-gray-200 py-3.5 text-sm font-extrabold text-gray-700 active:scale-[0.98]"
          >
            {t('backToMenu')}
          </button>
        </div>
      </div>
    );
  }

  /* --- This session has no order ----------------------------------------- */
  // A missing order (404 ORDER_NOT_FOUND) clears the id, and `OrderRedirect`
  // sends the customer back to the menu, so this only covers the brief window
  // before that navigation lands.
  if (!tracking) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-gray-50 px-8 text-center">
        <h1 className="text-xl font-extrabold text-gray-900">{t('noActiveOrder')}</h1>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex h-13 w-full max-w-xs items-center justify-center rounded-2xl bg-brand py-3.5 text-sm font-extrabold text-white active:scale-[0.98]"
        >
          {t('backToMenu')}
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden bg-gray-50"
      // Pull-to-refresh only applies on a touch device; a mouse drag here would
      // hijack normal selection.
      style={{ touchAction: pull.enabled ? 'none' : undefined }}
    >
      <PullIndicator pull={pull} label={t('orderPullToRefresh')} />

      <div
        className="sheet-scroll flex h-full flex-col overflow-y-auto"
        onTouchStart={pull.onTouchStart}
        onTouchMove={pull.onTouchMove}
        onTouchEnd={pull.onTouchEnd}
      >
        <header className="sticky top-0 z-10 flex items-center gap-3 bg-white/95 px-3 py-3 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label={t('backToMenu')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 transition active:bg-gray-100"
          >
            {/* Mirrored in RTL so "back" always points the way the reader came. */}
            <ArrowLeft className={`h-5 w-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-extrabold text-gray-900">
              {/* The label carries no trailing '#' so RTL languages read naturally. */}
              {t('orderNumber')} {tracking.orderNumber}
            </p>
            <p className="truncate text-[11px] font-semibold text-gray-400">
              {t('tableNumber')} {tracking.tableNumber}
              {tracking.createdAt ? ` · ${formatTime(tracking.createdAt, lang)}` : ''}
            </p>
          </div>

          {/* Quiet progress: a background poll never blocks the screen. */}
          <button
            type="button"
            onClick={() => void refetch()}
            aria-label={t('refresh')}
            disabled={isRefreshing}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 transition active:bg-gray-100 disabled:opacity-40"
          >
            <RefreshCw
              className={`h-5 w-5 ${isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}`}
            />
          </button>
        </header>

        {/* Announced once per transition, then dismissed on a timer. */}
        <OrderStatusBanner durationMs={STATUS_BANNER_MS} />

        <div className="space-y-3 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-3">
          <StatusCard tracking={tracking} isFinal={isFinal} stale={Boolean(error)} />

          {/* --- Stepper --- */}
          <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-gray-100">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-gray-900">{t('orderProgress')}</h2>
              {isRefreshing && (
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                  <RefreshCw className="h-3 w-3 animate-spin motion-reduce:animate-none" />
                  {t('liveUpdating')}
                </span>
              )}
            </div>
            <OrderStepper steps={tracking.steps} />
          </section>

          {/* --- Summary: only when a payload actually carried line items. --- */}
          {tracking.items.length > 0 && tracking.currencyCode && (
            <OrderSummaryCard
              order={tracking as OrderTrackingView & { currencyCode: CurrencyCode }}
            />
          )}

          {/* --- Actions --- */}
          <div className="space-y-2 pb-2">
            {canAddItems ? (
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-extrabold text-white shadow-lg transition-transform active:scale-[0.98]"
              >
                <Plus className="h-5 w-5" strokeWidth={3} />
                {t('addItemsToOrder')}
              </button>
            ) : (
              <p className="rounded-2xl bg-gray-100 px-4 py-3 text-center text-xs font-bold text-gray-500">
                {t('orderClosedCannotAdd')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Headline status card, with the icon that changes the moment a poll lands. */
function StatusCard({
  tracking,
  isFinal,
  stale,
}: {
  tracking: OrderTrackingView;
  isFinal: boolean;
  stale: boolean;
}) {
  const { t } = useLanguage();
  const { currentStatus } = tracking;

  return (
    <section
      className="relative overflow-hidden rounded-3xl bg-white p-5 text-center shadow-soft ring-1 ring-gray-100"
      style={{ borderTop: `3px solid ${currentStatus.color}` }}
    >
      {isFinal && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-16 opacity-[0.06]"
          style={{ backgroundColor: currentStatus.color }}
        />
      )}

      <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-gray-400">
        {t('currentStatus')}
      </p>

      {/* Icon with a pulse ring only while the order is in progress. */}
      <div className="relative mx-auto mb-3 flex h-20 w-20 items-center justify-center">
        {!isFinal && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full animate-status-pulse motion-reduce:animate-none"
            style={{ backgroundColor: currentStatus.color }}
          />
        )}
        <span
          className="relative flex h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: `${currentStatus.color}14` }}
        >
          <OrderStatusIcon code={currentStatus.code} color={currentStatus.color} className="h-10 w-10" />
        </span>
      </div>

      {/* Name and colour both come from the API, already translated server-side. */}
      <span
        className="inline-block rounded-full px-4 py-1.5 text-base font-extrabold"
        style={{ backgroundColor: `${currentStatus.color}14`, color: currentStatus.color }}
      >
        {currentStatus.name}
      </span>

      {stale && (
        <p className="mt-3 text-[11px] font-bold text-amber-600">{t('orderStaleWarning')}</p>
      )}
    </section>
  );
}

/** The pull indicator doubles as the "release to refresh" cue. */
function PullIndicator({
  pull,
  label,
}: {
  pull: ReturnType<typeof usePullToRefresh>;
  label: string;
}) {
  const { pullDistance, armed, refreshing } = pull;
  if (pullDistance === 0 && !refreshing) return null;

  const progress = Math.min(1, pullDistance / PULL_THRESHOLD_PX);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-end justify-center"
      style={{ height: pullDistance || 28 }}
    >
      <span
        className={`flex items-center gap-2 pb-2 text-[11px] font-extrabold ${
          armed ? 'text-gray-600' : 'text-gray-400'
        }`}
        style={{ transform: `scale(${0.8 + progress * 0.2})` }}
      >
        <RefreshCw
          className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin motion-reduce:animate-none' : ''}`}
        />
        {label}
      </span>
    </div>
  );
}

/**
 * Pull-to-refresh for the tracking screen.
 *
 * Only engages when the scroll container is already at the top, so a downward
 * drag part-way down the timeline scrolls the timeline instead of refreshing.
 * A refresh that is already running is never started twice.
 */
function usePullToRefresh(refresh: () => Promise<void>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [armed, setArmed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef(0);
  const dragging = useRef(false);

  const enabled = typeof window !== 'undefined' && 'ontouchstart' in window;

  const onTouchStart = useCallback((event: React.TouchEvent<HTMLElement>) => {
    const target = event.currentTarget;
    // Only from a resting scroll position.
    if (target.scrollTop > 0) {
      dragging.current = false;
      return;
    }
    startY.current = event.touches[0].clientY;
    dragging.current = true;
    setArmed(false);
  }, []);

  const onTouchMove = useCallback((event: React.TouchEvent<HTMLElement>) => {
    if (!dragging.current) return;
    const delta = event.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPullDistance(0);
      setArmed(false);
      return;
    }
    // Resistance grows with distance so the gesture never feels unbounded.
    const distance = Math.min(PULL_MAX_PX, delta * 0.5);
    setArmed(distance >= PULL_THRESHOLD_PX);
    setPullDistance(distance);
  }, []);

  const onTouchEnd = useCallback(() => {
    const shouldRefresh = dragging.current && armed && !refreshing;
    dragging.current = false;
    setArmed(false);
    setPullDistance(0);
    if (!shouldRefresh) return;
    setRefreshing(true);
    hapticFeedback(8);
    void refresh().finally(() => setRefreshing(false));
  }, [refresh, refreshing, armed]);

  return {
    enabled,
    pullDistance,
    armed,
    refreshing,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

function SkeletonHeader({ dir, onBack }: { dir: 'ltr' | 'rtl'; onBack: () => void }) {
  const { t } = useLanguage();
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 bg-white/95 px-3 py-3 shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={onBack}
        aria-label={t('backToMenu')}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 transition active:bg-gray-100"
      >
        <ArrowLeft className={`h-5 w-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
      </button>
      <div className="flex-1 space-y-1.5">
        <div className="mx-auto h-3.5 w-28 rounded skeleton" />
        <div className="mx-auto h-2.5 w-20 rounded skeleton" />
      </div>
      <span className="h-11 w-11 shrink-0" />
    </header>
  );
}
