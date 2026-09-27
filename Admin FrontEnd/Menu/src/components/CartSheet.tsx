import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useTable } from '@/contexts/TableContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatPrice, needsCurrencyNote, currencyNoteLabel } from '@/lib/formatPrice';
import { hapticFeedback } from '@/lib/haptics';
import { Plus, Minus, Trash2, ShoppingBag, Loader2 } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

export function CartSheet({
  open,
  onClose,
  onPlaceOrder,
  placing,
  checkoutError,
  onRetryCheckout,
}: {
  open: boolean;
  onClose: () => void;
  onPlaceOrder: () => void;
  placing: boolean;
  checkoutError: string | null;
  onRetryCheckout: () => void;
}) {
  const { tl, t, lang } = useLanguage();
  const { tableToken } = useTable();
  const { tenantCurrency, displayCurrency } = useCurrency();
  const { items, updateQuantity, removeFromCart, totalPrice } = useCart();

  if (!open) return null;

  return (
    <BottomSheet open={open} onDismiss={onClose} header={{ title: t('yourOrder'), onClose }}>
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 pb-safe text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <ShoppingBag className="h-10 w-10 text-gray-300" />
          </span>
          <p className="text-base font-extrabold text-gray-700">{t('emptyCart')}</p>
          <p className="text-sm font-medium text-gray-500">{t('emptyCartHint')}</p>
        </div>
      ) : (
        <>
          <div className="sheet-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
                    <img
                      src={item.product.image}
                      alt={tl(item.product.name)}
                      className="h-20 w-20 shrink-0 rounded-xl object-cover"
                    />

                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-sm font-bold leading-tight text-gray-900">
                          {tl(item.product.name)}
                        </h3>
                        <p className="mt-0.5 text-xs font-semibold text-gray-500">
                          {formatPrice(Math.round(price), tenantCurrency, displayCurrency, lang)} · {t('item')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            aria-label={t('quantity')}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition active:bg-gray-200"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-[1.25rem] text-center text-sm font-extrabold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateQuantity(item.product.id, item.quantity + 1);
                              hapticFeedback(5);
                            }}
                            aria-label={t('addToOrder')}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white transition active:scale-90"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              removeFromCart(item.product.id);
                              hapticFeedback(5);
                            }}
                            aria-label="Remove"
                            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition active:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="shrink-0 text-sm font-extrabold text-gray-900">
                          {formatPrice(Math.round(subtotal), tenantCurrency, displayCurrency, lang)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-100 bg-white px-4 pb-safe pt-3">
            {checkoutError && (
              <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                {checkoutError}
              </p>
            )}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-500">{t('total')}</span>
              <span className="text-2xl font-extrabold text-gray-900">
                {formatPrice(Math.round(totalPrice), tenantCurrency, displayCurrency, lang)}
              </span>
            </div>
            {needsCurrencyNote(tenantCurrency, displayCurrency) && (
              <p className="mb-2 text-center text-xs font-medium text-gray-400">
                {t('pricesShownIn')} {currencyNoteLabel(tenantCurrency)}
              </p>
            )}
            {!tableToken && (
              <p className="mb-3 text-center text-xs font-bold text-amber-600">{t('orderNeedsTable')}</p>
            )}
            <button
              type="button"
              onClick={checkoutError ? onRetryCheckout : onPlaceOrder}
              disabled={placing || !tableToken}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-extrabold text-white shadow-lg transition-transform active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
            >
              {placing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('placingOrder')}
                </>
              ) : checkoutError ? (
                t('retry')
              ) : (
                t('placeOrder')
              )}
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}