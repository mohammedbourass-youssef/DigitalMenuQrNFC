import { useLanguage } from '@/contexts/LanguageContext';
import { formatPrice, needsCurrencyNote, currencyNoteLabel } from '@/lib/formatPrice';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { CurrencyCode } from '@/lib/constants';
import type { OrderTrackingView } from '@/types/order';

/**
 * Order items and total.
 *
 * Every figure here is the **server's** — `order.total` and `order.items[].lineTotal`
 * were recalculated backend-side, so this never sums the client cart. Formatting
 * uses the order's own currency code, not the tenant's or the display preference,
 * because the order is a fixed priced record.
 *
 * Only rendered when `items` is non-empty *and* a currency is known: the
 * tracking endpoint carries neither, so a real deployment shows no summary
 * rather than a fabricated one or a total in the wrong currency.
 */
export function OrderSummaryCard({
  order,
}: {
  order: OrderTrackingView & { currencyCode: CurrencyCode };
}) {
  const { t, tl, lang } = useLanguage();
  const { displayCurrency } = useCurrency();
  const currency = order.currencyCode;

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-gray-100">
      <h2 className="mb-3 text-base font-extrabold text-gray-900">{t('orderSummary')}</h2>

      <ul className="space-y-2.5">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
            <span className="min-w-0 flex-1 text-gray-600">
              <span className="font-extrabold text-gray-500">{item.quantity}×</span>{' '}
              <span className="select-text">{tl(item.name)}</span>
            </span>
            <span className="shrink-0 font-extrabold text-gray-700">
              {formatPrice(Math.round(item.lineTotal), currency, lang)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-sm font-extrabold text-gray-900">{t('orderTotal')}</span>
        <span className="text-xl font-extrabold" style={{ color: 'var(--color-primary)' }}>
          {formatPrice(Math.round(order.total), currency, lang)}
        </span>
      </div>

      {needsCurrencyNote(currency, displayCurrency) && (
        <p className="mt-2 text-center text-[11px] font-medium text-gray-400">
          {t('pricesShownIn')} {currencyNoteLabel(currency)}
        </p>
      )}
    </section>
  );
}