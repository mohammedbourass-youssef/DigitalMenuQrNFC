import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatPrice } from '@/lib/formatPrice';
import { hapticFeedback } from '@/lib/haptics';
import { ShoppingBag } from 'lucide-react';

export function CartBar({ onClick }: { onClick: () => void }) {
  const { t, lang } = useLanguage();
  const { tenantCurrency, displayCurrency } = useCurrency();
  const { totalItems, totalPrice } = useCart();
  const [bump, setBump] = useState(false);
  const prevCount = useRef(totalItems);

  useEffect(() => {
    const prev = prevCount.current;
    prevCount.current = totalItems;
    if (totalItems > prev) {
      hapticFeedback(10);
      setBump(true);
      const timer = setTimeout(() => setBump(false), 300);
      return () => clearTimeout(timer);
    }
  }, [totalItems]);

  const show = totalItems > 0;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.8rem)] transition-transform duration-300 ease-out ${
        show ? 'translate-y-0' : 'pointer-events-none translate-y-[130%]'
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className={`relative flex h-14 w-full max-w-[480px] items-center justify-between rounded-2xl bg-brand px-5 text-white shadow-panel transition-transform ${
          bump ? 'animate-bump' : ''
        } active:scale-[0.98]`}
      >
        <span className="flex items-center gap-3">
          <span className="relative">
            <ShoppingBag className="h-6 w-6" />
            <span className="absolute -end-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-extrabold text-gray-900 shadow">
              {totalItems}
            </span>
          </span>
          <span className="text-sm font-extrabold">{t('viewCart')}</span>
        </span>
        <span className="text-lg font-extrabold">
          {formatPrice(Math.round(totalPrice), tenantCurrency, displayCurrency, lang)}
        </span>
      </button>
    </div>
  );
}