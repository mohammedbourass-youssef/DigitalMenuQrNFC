import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useTable } from '@/contexts/TableContext';
import { useTenant } from '@/contexts/TenantContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatPrice, needsCurrencyNote, currencyNoteLabel } from '@/lib/formatPrice';
import { hapticFeedback } from '@/lib/haptics';
import { UtensilsCrossed } from 'lucide-react';

export function OrderConfirmation({
  open,
  orderNumber,
  onNewOrder,
}: {
  open: boolean;
  orderNumber?: string | null;
  onNewOrder: () => void;
}) {
  const { tl, t, lang } = useLanguage();
  const { tenant } = useTenant();
  const { tenantCurrency, displayCurrency } = useCurrency();
  const { items, totalPrice, totalItems } = useCart();
  const { tableNumber } = useTable();

  useEffect(() => {
    if (open) hapticFeedback([20, 60, 20]);
  }, [open]);

  if (!open) return null;

  return (
    <div className="sheet-scroll fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white animate-fade-in">
      <div className="flex min-h-full flex-col items-center justify-center px-6 pt-safe pb-safe">
        {/* Animated Checkmark */}
        <div className="mb-8 flex flex-col items-center">
          <div
            className="animate-checkmark flex h-24 w-24 items-center justify-center rounded-full text-white shadow-xl"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <svg
              className="h-12 w-12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path className="checkmark-path" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <h1 className="mb-2 text-2xl font-extrabold text-gray-900">{t('orderConfirmed')}</h1>
        <p className="mb-1 text-base text-gray-500">{t('orderSentMessage')}</p>
        {orderNumber && (
          <p className="mb-8 text-4xl font-extrabold tracking-tight" style={{ color: 'var(--color-primary)' }}>
            {t('orderNumber')} {orderNumber}
          </p>
        )}
        {!orderNumber && <div className="mb-8 text-4xl">🍽️</div>}

        {/* Summary Card */}
        <div className="w-full max-w-sm rounded-3xl bg-gray-50 p-5 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900">{tenant?.name ?? ''}</p>
              <p className="text-xs text-gray-500">
                {t('tableConfirmed')} {tableNumber} · {totalItems} {totalItems > 1 ? t('items') : t('item')}
              </p>
            </div>
          </div>

          <div className="space-y-2 border-t border-gray-200 pt-3">
            {items.map((item) => {
              const price = item.product.promo
                ? item.product.promo.oldPrice * (1 - item.product.promo.discountPercent / 100)
                : item.product.price;
              return (
                <div key={item.product.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 text-gray-600">
                    <span className="font-bold text-gray-500">{item.quantity}×</span>{' '}
                    <span className="select-text">{tl(item.product.name)}</span>
                  </span>
                  <span className="shrink-0 font-bold text-gray-700">
                    {formatPrice(Math.round(price * item.quantity), tenantCurrency, displayCurrency, lang)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
            <span className="text-sm font-bold text-gray-900">{t('orderTotal')}</span>
            <span className="text-xl font-extrabold" style={{ color: 'var(--color-primary)' }}>
              {formatPrice(Math.round(totalPrice), tenantCurrency, displayCurrency, lang)}
            </span>
          </div>
          {needsCurrencyNote(tenantCurrency, displayCurrency) && (
            <p className="mt-2 text-center text-xs font-medium text-gray-400">
              {t('pricesShownIn')} {currencyNoteLabel(tenantCurrency)}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onNewOrder}
          className="mt-6 flex h-14 w-full max-w-sm items-center justify-center rounded-2xl bg-gray-900 text-base font-extrabold text-white shadow-lg transition-transform active:scale-[0.98]"
        >
          {t('newOrder')}
        </button>
      </div>
    </div>
  );
}