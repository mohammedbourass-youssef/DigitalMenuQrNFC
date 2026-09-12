import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { ShoppingBag } from 'lucide-react';

export function CartBar({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage();
  const { totalItems, totalPrice } = useCart();

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 safe-bottom">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={onClick}
          className="flex w-full items-center justify-between rounded-2xl py-3.5 px-5 text-white shadow-2xl transition-all duration-200 active:scale-[0.98]"
          style={{ backgroundColor: 'var(--brand-color)' }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingBag className="h-6 w-6" />
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-extrabold text-gray-900 shadow">
                {totalItems}
              </span>
            </div>
            <span className="text-sm font-bold">{t('viewCart')}</span>
          </div>
          <span className="text-lg font-extrabold">
            {Math.round(totalPrice)} {t('currency')}
          </span>
        </button>
      </div>
    </div>
  );
}
