import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useTable } from '@/contexts/TableContext';
import { restaurant } from '@/data';
import { UtensilsCrossed } from 'lucide-react';

export function OrderConfirmation({
  open,
  onNewOrder,
}: {
  open: boolean;
  onNewOrder: () => void;
}) {
  const { tl, t } = useLanguage();
  const { items, totalPrice, totalItems } = useCart();
  const { tableNumber } = useTable();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 animate-fade-in">
      {/* Animated Checkmark */}
      <div className="mb-8 flex flex-col items-center">
        <div
          className="animate-checkmark flex h-24 w-24 items-center justify-center rounded-full text-white shadow-xl"
          style={{ backgroundColor: 'var(--brand-color)' }}
        >
          <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path className="checkmark-path" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <h1 className="mb-2 text-2xl font-extrabold text-gray-900">{t('orderConfirmed')}</h1>
      <p className="mb-1 text-base text-gray-500">{t('orderSentMessage')}</p>
      <div className="mb-8 text-4xl">🍽️</div>

      {/* Summary Card */}
      <div className="w-full max-w-sm rounded-3xl bg-gray-50 p-5 shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: 'var(--brand-color)' }}
          >
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{tl(restaurant.name)}</p>
            <p className="text-xs text-gray-400">
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
              <div key={item.product.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  <span className="font-bold text-gray-400">{item.quantity}×</span> {tl(item.product.name)}
                </span>
                <span className="font-bold text-gray-700">
                  {Math.round(price * item.quantity)} {t('currency')}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
          <span className="text-sm font-bold text-gray-900">{t('orderTotal')}</span>
          <span className="text-xl font-extrabold" style={{ color: 'var(--brand-color)' }}>
            {Math.round(totalPrice)} {t('currency')}
          </span>
        </div>
      </div>

      <button
        onClick={onNewOrder}
        className="mt-6 w-full max-w-sm rounded-2xl bg-gray-900 py-4 text-base font-extrabold text-white shadow-lg transition active:scale-[0.98]"
      >
        {t('newOrder')}
      </button>
    </div>
  );
}
