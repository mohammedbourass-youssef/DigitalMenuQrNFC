import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useTable } from '@/contexts/TableContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatPrice, needsCurrencyNote, currencyNoteLabel } from '@/lib/formatPrice';
import { hapticFeedback } from '@/lib/haptics';
import { Plus, Minus, Trash2, ShoppingBag, Loader2, X } from 'lucide-react';

interface CartBottomSheetProps {
  open: boolean;
  onClose: () => void;
  /**
   * Single confirm action with two behaviours, decided by the caller from
   * `hasOrder`: create a new order, or add items to the existing one.
   */
  onConfirmOrder: () => void;
  placing: boolean;
  checkoutError: string | null;
  /** Whether this session already has an order — switches the label/banner. */
  hasOrder: boolean;
  /** False once the order is closed, which disables the confirm button. */
  canAddItems: boolean;
  /** Order number shown in the "adding to order #N" banner. */
  orderNumber?: number | null;
}

/** Unit price for a cart line, honouring an active promo. */
function unitPrice(product: CartLine['product']): number {
  return product.promo
    ? product.promo.oldPrice * (1 - product.promo.discountPercent / 100)
    : product.price;
}

type CartLine = ReturnType<typeof useCart>['items'][number];

/**
 * Cart modal sheet, modelled on Flutter's showModalBottomSheet: a scrim that
 * dims and dismisses on tap, a panel that slides up from the bottom edge, a
 * drag handle that can be swiped down to close, and a pinned footer.
 */
export function CartBottomSheet({
  open,
  onClose,
  onConfirmOrder,
  placing,
  checkoutError,
  hasOrder,
  canAddItems,
  orderNumber,
}: CartBottomSheetProps) {
  const { t, tl, lang } = useLanguage();
  const { hasTable } = useTable();
  const { displayCurrency } = useCurrency();
  const { items, updateQuantity, removeFromCart, totalPrice, totalItems, cartCurrency } = useCart();

  // The API prices items per requested currency, so the cart is labelled with
  // the currency its own lines are in, falling back for legacy stored items.
  const currency = cartCurrency ?? displayCurrency;

  // A closed order cannot be extended, whatever the cart holds.
  const blockedByStatus = hasOrder && !canAddItems;

  const [entered, setEntered] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStart = useRef(0);
  const dragging = useRef(false);
  const closeRef = useRef(onClose);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // Slide the panel up on open.
  useEffect(() => {
    if (!open) return;
    setDragOffset(0);
    setEntered(false);
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Lock the page behind the scrim, close on Escape, and move focus in/out.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    const before = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      before?.focus?.();
    };
  }, [open]);

  // An emptied cart should not leave an empty sheet hanging open.
  useEffect(() => {
    if (open && items.length === 0) closeRef.current();
  }, [open, items.length]);

  if (!open) return null;

  const dismiss = () => {
    hapticFeedback(8);
    closeRef.current();
  };

  const onHandleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    dragStart.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onHandleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dy = e.clientY - dragStart.current;
    setDragOffset(dy > 0 ? dy : 0);
  };

  const onHandleUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragOffset > 100) closeRef.current();
    else setDragOffset(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label={t('close')}
        onClick={dismiss}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: dragOffset > 0 ? 'none' : 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className={`relative flex max-h-[92dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-sheet bg-white shadow-panel ${
          entered && dragOffset === 0 ? 'translate-y-0' : dragOffset === 0 ? 'translate-y-full' : ''
        }`}
      >
        <div
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
          className="flex shrink-0 cursor-grab justify-center pb-1 pt-2.5 active:cursor-grabbing"
        >
          <div className="h-1.5 w-11 rounded-full bg-gray-900/15" />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3">
          <h2 className="min-w-0 flex-1 text-lg font-extrabold text-gray-900">
            {t('yourOrder')}
            <span className="ms-2 text-base font-bold text-gray-400">({totalItems})</span>
          </h2>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t('close')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition active:bg-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 pb-10 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <ShoppingBag className="h-10 w-10 text-gray-300" />
            </span>
            <p className="text-base font-extrabold text-gray-700">{t('emptyCart')}</p>
            <p className="text-sm font-medium text-gray-500">{t('emptyCartHint')}</p>
          </div>
        ) : (
          <>
            <div className="sheet-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              {/* Makes it unambiguous that this will extend the existing order
                  rather than create a second one. */}
              {hasOrder && orderNumber != null && (
                <p className="mb-3 rounded-2xl bg-brand/10 px-3 py-2 text-center text-xs font-extrabold text-brand">
                  {t('addingToOrder')} #{orderNumber}
                </p>
              )}
              <div className="space-y-3">
                {items.map((item) => {
                  const price = unitPrice(item.product);
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
                            {formatPrice(Math.round(price), currency, lang)} ·{' '}
                            {t('item')}
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
                              aria-label={t('remove')}
                              className="ms-1 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition active:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <span className="shrink-0 text-sm font-extrabold text-gray-900">
                            {formatPrice(
                              Math.round(price * item.quantity),
                              currency,
                              lang,
                            )}
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
                  {formatPrice(Math.round(totalPrice), currency, lang)}
                </span>
              </div>
              {needsCurrencyNote(currency, displayCurrency) && (
                <p className="mb-2 text-center text-xs font-medium text-gray-400">
                  {t('pricesShownIn')} {currencyNoteLabel(currency)}
                </p>
              )}
              {!hasTable && (
                <p className="mb-3 text-center text-xs font-bold text-amber-600">
                  {t('orderNeedsTable')}
                </p>
              )}
              {blockedByStatus && (
                <p className="mb-3 rounded-xl bg-gray-100 px-3 py-2 text-center text-xs font-bold text-gray-500">
                  {t('orderClosedCannotAdd')}
                </p>
              )}
              <button
                type="button"
                onClick={onConfirmOrder}
                // `placing` is the double-tap guard; the disabled states are the
                // preconditions the handler would otherwise reject anyway.
                disabled={placing || !hasTable || blockedByStatus}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-extrabold text-white shadow-lg transition-transform active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
              >
                {placing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t('placingOrder')}
                  </>
                ) : checkoutError ? (
                  t('retry')
                ) : hasOrder ? (
                  t('addToMyOrder')
                ) : (
                  t('confirmOrder')
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
