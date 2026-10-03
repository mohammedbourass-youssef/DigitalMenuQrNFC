import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSessionOrder } from '@/contexts/SessionOrderContext';
import { hapticFeedback } from '@/lib/haptics';
import { Check } from 'lucide-react';

/**
 * Announces a status change.
 *
 * The customer is usually looking at the screen when the kitchen moves the
 * order, so a quiet background poll needs one clear signal: a short banner with
 * the new status name and a haptic tap. It dismisses itself, and it is keyed on
 * the transition timestamp so returning to the screen shows the latest
 * transition rather than a stale one.
 *
 * The banner sits above the content in the normal flow rather than floating, so
 * it cannot cover the headline status card or intercept a tap on "add items".
 */
export function OrderStatusBanner({
  durationMs = 4_000,
}: {
  durationMs?: number;
}) {
  const { t } = useLanguage();
  const { statusUpdate, dismissStatusUpdate } = useSessionOrder();

  // Delays removal by one frame so the enter animation is not skipped.
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!statusUpdate) return;
    setLeaving(false);
    const timer = window.setTimeout(() => setLeaving(true), durationMs);
    return () => window.clearTimeout(timer);
  }, [statusUpdate, durationMs]);

  useEffect(() => {
    if (statusUpdate && !leaving) {
      // A short double-tap reads as "noted" without the buzz of a long pattern.
      hapticFeedback([12, 60, 18]);
    }
  }, [statusUpdate, leaving]);

  useEffect(() => {
    if (statusUpdate && leaving) dismissStatusUpdate();
  }, [statusUpdate, leaving, dismissStatusUpdate]);

  if (!statusUpdate) return null;

  return (
    <div
      className="overflow-hidden px-4 pt-3"
      // Announced to assistive tech without stealing focus.
      role="status"
      aria-live="polite"
    >
      <div
        className={`animate-status-banner-in ${leaving ? 'animate-status-banner-out' : ''}`}
        style={{ backgroundColor: `${statusUpdate.color}14` }}
      >
        <p
          className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-extrabold ring-1"
          style={{ color: statusUpdate.color, boxShadow: `inset 0 0 0 1px ${statusUpdate.color}33` }}
        >
          <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />
          <span className="min-w-0 truncate">
            {t('orderStatusUpdated')} · {statusUpdate.statusName}
          </span>
        </p>
      </div>
    </div>
  );
}
