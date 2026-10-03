import { useLanguage } from '@/contexts/LanguageContext';
import { Check } from 'lucide-react';
import { formatStepTimestamp } from '@/utils/dateTime';
import type { TrackingStep } from '@/types/order';

/**
 * Status timeline.
 *
 * Rendered from the `steps` array the tracking endpoint returns, in exactly the
 * order it sent them: the server knows which statuses this tenant uses and in
 * what sequence, and guessing from a client-side catalogue is what previously
 * broke whenever the two disagreed.
 *
 * Each step's `state` (Completed / Current / Upcoming) is the backend's answer,
 * so the timeline and the headline status can never contradict each other.
 *
 * RTL safety: the vertical track uses logical properties throughout
 * (`start`/`end`), so it flips with `dir` and needs no variant classes.
 */
export function OrderStepper({ steps }: { steps: TrackingStep[] }) {
  const { t, lang } = useLanguage();

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const isDone = step.state === 'Completed';
        const isCurrent = step.state === 'Current';
        const isFuture = step.state === 'Upcoming';

        // Upcoming steps have no timestamp, and an unparseable one renders as
        // '' so we never fall back to showing the browser's "Invalid Date".
        const reachedLabel = isDone && step.changedAtUtc
          ? formatStepTimestamp(step.changedAtUtc, lang)
          : '';
        const color = step.color;

        return (
          <li
            // statusId is unique per status, but the index keeps the key stable
            // even if a tenant ever repeats one in a single timeline.
            key={`${index}-${step.statusId}`}
            className="relative flex gap-3 pb-5 last:pb-0"
          >
            {/* Connector: sits on the inline-start edge and inherits direction. */}
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute start-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5 rounded ${
                  isDone ? 'bg-gray-300' : 'bg-gray-200'
                }`}
              />
            )}

            <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center">
              {isCurrent && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full animate-status-pulse motion-reduce:animate-none"
                  style={{ backgroundColor: color }}
                />
              )}
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-white ring-2 transition-colors ${
                  isCurrent ? 'animate-step-pop motion-reduce:animate-none' : ''
                } ${
                  // A step that just completed draws attention once, then settles.
                  step.justCompleted ? 'animate-step-complete motion-reduce:animate-none' : ''
                }`}
                style={
                  isFuture ? undefined : { boxShadow: `inset 0 0 0 2px ${isDone || isCurrent ? color : '#E5E7EB'}` }
                }
              >
                {isDone ? (
                  <Check className="h-4 w-4" style={{ color }} strokeWidth={3} />
                ) : (
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${isCurrent ? '' : 'bg-gray-300'}`}
                    style={isCurrent ? { backgroundColor: color } : undefined}
                  />
                )}
              </span>
            </span>

            <span className="flex min-w-0 flex-1 flex-col justify-center pt-0.5">
              {/* Server-translated for the request's language, so rendered as-is. */}
              <span
                className={`text-sm font-extrabold ${isFuture ? 'text-gray-400' : 'text-gray-900'}`}
              >
                {step.statusName || t('loading')}
              </span>
              {reachedLabel && (
                <span className="text-[11px] font-semibold text-gray-400">{reachedLabel}</span>
              )}
              {isCurrent && !reachedLabel && (
                <span className="text-[11px] font-semibold text-gray-400">{t('statusNow')}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
