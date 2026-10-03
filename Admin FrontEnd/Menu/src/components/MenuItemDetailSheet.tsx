import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatPrice } from '@/lib/formatPrice';
import { hapticFeedback } from '@/lib/haptics';
import { isSupportedCurrency } from '@/lib/constants';
import type { CurrencyCode } from '@/lib/constants';
import { toCartProduct, buildGallery } from '@/types/menuItem';
import type { MenuItemPublicDTO } from '@/types/menuItem';
import { X, Plus, Minus, Clock, Award } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { ImageGallery } from './ImageGallery';

/**
 * Item detail: full image gallery, untruncated description, price with the
 * struck-through original while a discount is running, and quantity controls.
 *
 * Rendered inside the shared `BottomSheet`, so backdrop tap, swipe-down and the
 * back button all dismiss it, and the sheet's focus trap keeps the menu behind
 * inert while it is open.
 */
export function MenuItemDetailSheet({
  item,
  open,
  onClose,
}: {
  item: MenuItemPublicDTO | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t, lang } = useLanguage();
  const { tenantCurrency } = useCurrency();
  const { addToCart, getProductQuantity } = useCart();
  const [quantity, setQuantity] = useState(1);

  const itemId = item?.id ?? null;

  // Seed the stepper from what is already in the cart. Keyed on the id rather
  // than the object so a refetch that replaces the item object does not reset
  // the quantity the customer had chosen.
  useEffect(() => {
    if (!open || !itemId) return;
    setQuantity(getProductQuantity(itemId) || 1);
  }, [open, itemId, getProductQuantity]);

  if (!open || !item) return null;

  const currency: CurrencyCode = isSupportedCurrency(item.currencyCode)
    ? item.currencyCode
    : tenantCurrency;

  const discounted = item.originalPrice !== null && item.originalPrice > item.price;

  // Cover first, then the gallery, de-duplicated — the backend's `images` may
  // already contain the cover.
  const gallery = buildGallery(item);

  const totalPrice = item.price * quantity;
  const currentQty = getProductQuantity(item.id);

  const handleAdd = () => {
    const toAdd = quantity - currentQty;
    addToCart(toCartProduct(item), toAdd > 0 ? toAdd : quantity);
    hapticFeedback(20);
    onClose();
  };

  return (
    <BottomSheet open={open} onDismiss={onClose}>
      {/* Fixed height, not an aspect ratio: every wrapper below this uses
          `h-full`, and against an `auto`/`aspect-ratio` parent that percentage
          resolves to `auto`, letting the image's intrinsic height resize the
          frame (measured 480x361 instead of 480x300). An explicit height makes
          the frame identical for every item and every slide. `overflow-hidden`
          keeps the photo inside the panel's rounded top corners. */}
      <div className="relative h-[300px] w-full shrink-0 overflow-hidden bg-gray-100">
        <ImageGallery images={gallery} alt={item.name} className="h-full w-full" />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {item.isFeatured && (
          <span className="absolute start-4 top-12 flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold text-amber-950 shadow-lg">
            <Award className="h-3.5 w-3.5" />
            {t('chefsPick')}
          </span>
        )}

        {discounted && (
          <span className="absolute end-16 top-12 rounded-full bg-red-500 px-3 py-1 text-xs font-extrabold text-white shadow-lg">
            {t('off')}
          </span>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="absolute end-4 top-12 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-lg backdrop-blur transition active:scale-90"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="absolute inset-x-4 bottom-4 text-xl font-extrabold text-white drop-shadow-lg">
          {item.name}
        </h2>
      </div>

      <div className="sheet-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {item.preparationTimeMinutes !== null && (
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
            <Clock className="h-3.5 w-3.5" />~{item.preparationTimeMinutes} {t('minutes')}
          </span>
        )}

        {item.description && (
          <p className="mb-4 select-text text-sm leading-relaxed text-gray-600">
            {item.description}
          </p>
        )}

        <div className="mb-5 flex items-baseline gap-2">
          {discounted && (
            <span className="text-sm font-semibold text-gray-500 line-through">
              {formatPrice(Math.round(item.originalPrice as number), currency, lang)}
            </span>
          )}
          <span className="text-2xl font-extrabold text-gray-900">
            {formatPrice(Math.round(item.price), currency, lang)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">{t('quantity')}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label={t('quantity')}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition active:bg-gray-200"
            >
              <Minus className="h-5 w-5" />
            </button>
            <span className="min-w-[2rem] text-center text-lg font-extrabold text-gray-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label={t('quantity')}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-md transition active:scale-90"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white px-4 pb-safe pt-3">
        <button
          type="button"
          onClick={handleAdd}
          className="flex h-14 w-full items-center justify-between rounded-2xl bg-brand px-5 text-white shadow-lg transition-transform active:scale-[0.98]"
        >
          <span className="text-sm font-extrabold">
            {t('addToOrder')} · {quantity} {quantity > 1 ? t('items') : t('item')}
          </span>
          <span className="text-lg font-extrabold">
            {formatPrice(Math.round(totalPrice), currency, lang)}
          </span>
        </button>
      </div>
    </BottomSheet>
  );
}
