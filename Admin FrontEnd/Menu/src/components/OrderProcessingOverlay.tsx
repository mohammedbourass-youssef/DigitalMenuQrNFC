import { ChefHat } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Full-screen processing state shown while a create/add request is in flight.
 *
 * Deliberately not a plain spinner: a two-step "New → Preparing" track with a
 * moving progress line and a bobbing chef hat communicates that the order is
 * being handed to the kitchen, which is what the customer is actually waiting
 * for. Overlays the whole viewport so the confirm button underneath cannot be
 * tapped twice.
 */
export function OrderProcessingOverlay({ show }: { show: boolean }) {
  const { t } = useLanguage();
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white/95 px-8 backdrop-blur-sm animate-fade-in"
      role="status"
      aria-live="polite"
    >
      {/* Chef hat with animated "..." */}
      <div className="relative mb-8">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-brand/10 animate-status-pulse motion-reduce:animate-none"
        />
        <div className="relative flex h-28 w-28 items-center justify-center">
          <ChefHat
            className="h-16 w-16 text-brand animate-chef-bob motion-reduce:animate-none"
            strokeWidth={1.75}
          />
        </div>
        <span className="absolute bottom-1 start-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden="true">
          {[0, 0.2, 0.4].map((delay) => (
            <span
              key={delay}
              className="h-2 w-2 rounded-full bg-brand animate-dot-blink motion-reduce:animate-none"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </span>
      </div>

      <p className="mb-1 text-center text-lg font-extrabold text-gray-900">
        {t('sendingToKitchen')}
      </p>

      {/* Two-step track: New -> Preparing */}
      <div className="mt-6 w-full max-w-[280px]">
        <div className="relative flex items-center justify-between">
          <span className="flex flex-col items-center gap-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white">
              <span className="h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            <span className="text-[11px] font-extrabold text-gray-900">{t('statusNew')}</span>
          </span>

          <span className="flex flex-col items-center gap-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <ChefHat className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="text-[11px] font-extrabold text-gray-500">{t('statusPreparing')}</span>
          </span>

          {/* Track + travelling progress line. Inherits direction, so the sweep
              runs toward the second step in both LTR and RTL. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-4 top-4 h-0.5 rounded-full bg-gray-200"
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-4 top-4 h-0.5 overflow-hidden rounded-full"
          >
            <span className="block h-full w-1/3 rounded-full bg-brand animate-progress-sweep motion-reduce:animate-none" />
          </span>
        </div>
      </div>

      <p className="mt-8 max-w-[260px] text-center text-xs font-semibold text-gray-400">
        {t('pleaseWaitKitchen')}
      </p>
    </div>
  );
}