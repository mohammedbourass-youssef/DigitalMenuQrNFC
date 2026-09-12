import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import type { Product } from '@/types';
import { X, Plus, Minus } from 'lucide-react';

export function ProductDetailSheet({
  product,
  open,
  onClose,
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}) {
  const { tl, t } = useLanguage();
  const { addToCart, getProductQuantity } = useCart();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (open && product) {
      setQuantity(getProductQuantity(product.id) || 1);
    }
  }, [open, product, getProductQuantity]);

  if (!open || !product) return null;

  const displayPrice = product.promo
    ? product.promo.oldPrice * (1 - product.promo.discountPercent / 100)
    : product.price;

  const totalPrice = displayPrice * quantity;

  const handleAdd = () => {
    const currentQty = getProductQuantity(product.id);
    const toAdd = quantity - currentQty;
    if (toAdd > 0) {
      addToCart(product, toAdd);
    } else if (toAdd < 0) {
      addToCart(product, quantity);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 animate-fade-in" />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-slide-up sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <img src={product.image} alt={tl(product.name)} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {product.promo && (
            <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-sm font-extrabold text-white shadow-lg">
              -{product.promo.discountPercent}% {t('off')}
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-lg backdrop-blur transition hover:bg-white active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-xl font-extrabold text-white drop-shadow-lg">
              {tl(product.name)}
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[45vh] overflow-y-auto p-5">
          <p className="mb-4 text-sm leading-relaxed text-gray-500">
            {tl(product.description)}
          </p>

          {/* Price */}
          <div className="mb-5 flex items-baseline gap-2">
            {product.promo && (
              <span className="text-base font-medium text-gray-300 line-through">
                {product.promo.oldPrice} {t('currency')}
              </span>
            )}
            <span className="text-2xl font-extrabold" style={{ color: 'var(--brand-color)' }}>
              {Math.round(displayPrice)} {t('currency')}
            </span>
          </div>

          {/* Quantity Stepper */}
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">{t('quantity')}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200 active:scale-90"
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="min-w-[2rem] text-center text-lg font-extrabold text-gray-900">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md transition active:scale-90"
                style={{ backgroundColor: 'var(--brand-color)' }}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 safe-bottom">
          <button
            onClick={handleAdd}
            className="flex w-full items-center justify-between rounded-2xl py-4 px-5 text-white shadow-lg transition active:scale-[0.98]"
            style={{ backgroundColor: 'var(--brand-color)' }}
          >
            <span className="text-sm font-bold">
              {t('addToOrder')} · {quantity} {quantity > 1 ? t('items') : t('item')}
            </span>
            <span className="text-lg font-extrabold">
              {Math.round(totalPrice)} {t('currency')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
