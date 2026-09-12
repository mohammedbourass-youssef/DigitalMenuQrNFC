import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import type { Product } from '@/types';
import { Plus, Check } from 'lucide-react';

export function ProductCard({
  product,
  onCardClick,
}: {
  product: Product;
  onCardClick: (product: Product) => void;
}) {
  const { tl, t } = useLanguage();
  const { addToCart, getProductQuantity, lastAddedId } = useCart();
  const qty = getProductQuantity(product.id);
  const justAdded = lastAddedId === product.id;

  const displayPrice = product.promo
    ? product.promo.oldPrice * (1 - product.promo.discountPercent / 100)
    : product.price;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
  };

  return (
    <div
      onClick={() => onCardClick(product)}
      className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100 transition-all duration-300 hover:shadow-lg hover:ring-gray-200 active:scale-[0.98]"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={product.image}
          alt={tl(product.name)}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Promo Badge */}
        {product.promo && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs font-extrabold text-white shadow-lg">
            <span className="animate-pulse">●</span>
            -{product.promo.discountPercent}%
          </div>
        )}

        {/* Quantity badge if in cart */}
        {qty > 0 && (
          <div className="absolute right-3 top-3 flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-extrabold text-gray-900 shadow-md">
            {qty}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="mb-1 text-base font-bold leading-snug text-gray-900">
          {tl(product.name)}
        </h3>
        <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-gray-400">
          {tl(product.description)}
        </p>

        <div className="flex items-center justify-between">
          {/* Price */}
          <div className="flex flex-col">
            {product.promo && (
              <span className="text-xs font-medium text-gray-300 line-through">
                {product.promo.oldPrice} {t('currency')}
              </span>
            )}
            <span className="text-lg font-extrabold text-gray-900">
              {Math.round(displayPrice)} {t('currency')}
            </span>
          </div>

          {/* Add Button */}
          <button
            onClick={handleAdd}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md transition-all duration-200 active:scale-90 ${
              justAdded ? 'animate-bounce-pop' : ''
            }`}
            style={{ backgroundColor: 'var(--brand-color)' }}
            aria-label={t('addToOrder')}
          >
            {justAdded ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
