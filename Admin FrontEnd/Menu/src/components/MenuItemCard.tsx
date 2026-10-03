import { memo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatPrice } from '@/lib/formatPrice';
import { hapticFeedback } from '@/lib/haptics';
import { isSupportedCurrency } from '@/lib/constants';
import type { CurrencyCode } from '@/lib/constants';
import type { MenuItemPublicDTO } from '@/types/menuItem';
import { toCartProduct } from '@/types/menuItem';
import { Plus, Check, Utensils, Clock, Award } from 'lucide-react';

function MenuItemCardBase({
  item,
  onClick,
}: {
  item: MenuItemPublicDTO;
  onClick: (item: MenuItemPublicDTO) => void;
}) {
  const { t, lang } = useLanguage();
  const { tenantCurrency } = useCurrency();
  const { addToCart, getProductQuantity, lastAddedId } = useCart();
  const qty = getProductQuantity(item.id);
  const justAdded = lastAddedId === item.id;
  const [imgState, setImgState] = useState<'loading' | 'ok' | 'error'>('loading');

  // The item states its own currency; fall back to the tenant's when it is
  // outside the set the formatter knows how to render.
  const currency: CurrencyCode = isSupportedCurrency(item.currencyCode)
    ? item.currencyCode
    : tenantCurrency;

  // `originalPrice` is only set while a discount is active, and is then the
  // higher of the two — so it is safe to show struck through without comparing.
  const discounted = item.originalPrice !== null && item.originalPrice > item.price;

  const handleQuickAdd = (e: React.MouseEvent) => {
    // Keeps the card's own add button from also opening the detail sheet: the
    // card is a click target for the whole tile.
    e.stopPropagation();
    addToCart(toCartProduct(item), 1);
    hapticFeedback(10);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(item);
        }
      }}
      aria-label={item.name}
      className="flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white text-start shadow-sm ring-1 ring-gray-100 transition-transform duration-200 active:scale-[0.97]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        {imgState === 'loading' && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
        {imgState === 'error' || !item.coverImage ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <Utensils className="h-8 w-8 text-gray-300" />
          </div>
        ) : (
          <img
            src={item.coverImage}
            alt={item.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgState('ok')}
            onError={() => setImgState('error')}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {item.isFeatured && (
          <span className="absolute start-2.5 top-2.5 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-amber-950 shadow-lg">
            <Award className="h-3 w-3" />
            {t('chefsPick')}
          </span>
        )}

        {discounted && (
          <span className="absolute end-2.5 top-2.5 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-extrabold text-white shadow-lg">
            {t('off')}
          </span>
        )}

        {qty > 0 && (
          <span className="absolute bottom-2.5 start-2.5 flex h-8 min-w-8 items-center justify-center rounded-full bg-white/95 px-2 text-xs font-extrabold text-gray-900 shadow-lg backdrop-blur">
            {qty}
          </span>
        )}

        <button
          type="button"
          onClick={handleQuickAdd}
          aria-label={t('addToOrder')}
          className={`absolute bottom-2.5 end-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-transform duration-150 active:scale-90 ${
            justAdded ? 'animate-bounce-pop' : ''
          }`}
        >
          {justAdded ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex w-full flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 min-w-0 text-sm font-bold leading-snug text-gray-900">
          {item.name}
        </h3>
        {item.description && (
          <p className="line-clamp-2 select-text text-xs font-medium text-gray-500">
            {item.description}
          </p>
        )}
        {item.preparationTimeMinutes !== null && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400">
            <Clock className="h-3 w-3" />~{item.preparationTimeMinutes} {t('minutes')}
          </span>
        )}
        <div className="mt-auto flex items-baseline gap-1.5 pt-1.5">
          {discounted && (
            <span className="text-[11px] font-semibold text-gray-500 line-through">
              {formatPrice(Math.round(item.originalPrice as number), currency, lang)}
            </span>
          )}
          <span className="text-base font-extrabold text-gray-900">
            {formatPrice(Math.round(item.price), currency, lang)}
          </span>
        </div>
      </div>
    </div>
  );
}

export const MenuItemCard = memo(MenuItemCardBase);
