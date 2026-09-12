import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';

export function CartSheet({
  open,
  onClose,
  onPlaceOrder,
}: {
  open: boolean;
  onClose: () => void;
  onPlaceOrder: () => void;
}) {
  const { tl, t } = useLanguage();
  const { items, updateQuantity, removeFromCart, totalPrice, totalItems } = useCart();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 animate-fade-in" />
      <div
        className="relative flex h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-gray-50 shadow-2xl animate-slide-up sm:h-[85vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-extrabold text-gray-900">{t('yourOrder')}</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">
              {totalItems}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <ShoppingBag className="h-10 w-10 text-gray-300" />
              </div>
              <p className="text-base font-bold text-gray-700">{t('emptyCart')}</p>
              <p className="text-sm text-gray-400">{t('emptyCartHint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const price = item.product.promo
                  ? item.product.promo.oldPrice * (1 - item.product.promo.discountPercent / 100)
                  : item.product.price;
                const subtotal = price * item.quantity;

                return (
                  <div
                    key={item.product.id}
                    className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100"
                  >
                    {/* Image */}
                    <img
                      src={item.product.image}
                      alt={tl(item.product.name)}
                      className="h-20 w-20 shrink-0 rounded-xl object-cover"
                    />

                    {/* Info */}
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold leading-tight text-gray-900">
                          {tl(item.product.name)}
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {Math.round(price)} {t('currency')} · {t('item')}
                        </p>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200 active:scale-90"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-[1.5rem] text-center text-sm font-extrabold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm transition active:scale-90"
                            style={{ backgroundColor: 'var(--brand-color)' }}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-gray-300 transition hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="text-sm font-extrabold text-gray-900">
                          {Math.round(subtotal)} {t('currency')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 bg-white p-4 safe-bottom">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-500">{t('total')}</span>
              <span className="text-2xl font-extrabold text-gray-900">
                {Math.round(totalPrice)} {t('currency')}
              </span>
            </div>
            <button
              onClick={onPlaceOrder}
              className="w-full rounded-2xl py-4 text-base font-extrabold text-white shadow-lg transition active:scale-[0.98]"
              style={{ backgroundColor: 'var(--brand-color)' }}
            >
              {t('placeOrder')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
