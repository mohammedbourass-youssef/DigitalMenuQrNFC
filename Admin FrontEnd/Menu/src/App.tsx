import { useState, useCallback, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { TenantProvider } from '@/contexts/TenantContext';
import { CurrencyProvider, useCurrency } from '@/contexts/CurrencyContext';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { TableProvider, useTable } from '@/contexts/TableContext';
import { SessionOrderProvider, useSessionOrder } from '@/contexts/SessionOrderContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCategories, useSessionExpiryGuard } from '@/hooks/useCategories';
import { useMenuItems } from '@/hooks/useMenuItems';
import { ALL_CATEGORY_ID } from '@/data/allCategory';
import { useAutoSelectTableFromUrl } from '@/hooks/useAutoSelectTableFromUrl';
import { addItemsToOrder, submitOrder, trackCreatedOrder } from '@/services/orderService';
import { ApiError } from '@/lib/errors';
import { navigate, useRoute } from '@/lib/router';
import { Header } from '@/components/Header';
import { CategoryTabs } from '@/components/CategoryTabs';
import { MenuItemsGrid } from '@/components/MenuItemsGrid';
import { CartBar } from '@/components/CartBar';
import { InvalidTableScreen } from '@/components/InvalidTableScreen';
import { OrderTrackingBar } from '@/components/OrderTrackingBar';
import { OrderProcessingOverlay } from '@/components/OrderProcessingOverlay';
import type { LocalizedString, Product } from '@/types';
import type { CreateOrderRequest, OrderItemRequest } from '@/types/order';

const MenuItemDetailSheet = lazy(() =>
  import('@/components/MenuItemDetailSheet').then((m) => ({ default: m.MenuItemDetailSheet })),
);
const CartBottomSheet = lazy(() =>
  import('@/components/CartBottomSheet').then((m) => ({ default: m.CartBottomSheet })),
);
const OrderTrackingPage = lazy(() =>
  import('@/pages/OrderTrackingPage').then((m) => ({ default: m.OrderTrackingPage })),
);

/**
 * Unit price for a cart line, honouring an active promo.
 *
 * Mirrors the calculation in `CartBottomSheet` so the amount sent matches what
 * the customer was shown. The backend recalculates it anyway — these figures only
 * satisfy the DTO's `[Required]` price fields.
 */
function lineUnitPrice(product: Product): number {
  return product.promo
    ? product.promo.oldPrice * (1 - product.promo.discountPercent / 100)
    : product.price;
}

function MenuApp() {
  const { t, lang } = useLanguage();
  const { items, clearCart, cartCurrency } = useCart();
  const { tableId, tableToken, tableNumber, tableStatus, dismissInvalid } = useTable();
  const { displayCurrency } = useCurrency();
  const { tracking, orderId, isFinal, canAddItems, registerOrder, refetch, refreshInBackground } = useSessionOrder();
  const { route, navigate } = useRoute();
  const { categories } = useCategories();
  useSessionExpiryGuard();
  useAutoSelectTableFromUrl();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  // The open product is tracked by id, not by object, so a menu refetch while
  // the sheet is open resolves to the new copy of the same product instead of
  // pinning the stale one. See `selectedItem` below.
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const hasOrder = orderId !== null;
  const currency = cartCurrency ?? displayCurrency;

  const handleItemClick = useCallback((item: { id: string }) => {
    setSelectedItemId(item.id);
    setDetailOpen(true);
  }, []);

  /**
   * The single confirm action, with two behaviours.
   *
   * A session has at most one order, so this branches on whether one already
   * exists: no order -> create; order -> add items to it. `Create Order` is
   * never called once `hasOrder` is true, which is what keeps the one-order
   * rule intact.
   */
  const handleConfirmOrder = useCallback(async () => {
    if ((!tableId && !tableToken) || placing) return;
    if (items.length === 0 || !tableNumber) return;
    // A closed order cannot be extended; the server enforces this too, but
    // refusing up front keeps the button from firing a doomed request.
    if (hasOrder && isFinal) return;

    const orderItems: OrderItemRequest[] = items.map((line) => {
      const unitPrice = lineUnitPrice(line.product);
      return {
        Id: line.product.id,
        Quantity: line.quantity,
        UnitPrice: unitPrice,
        TotalPrice: unitPrice * line.quantity,
      };
    });
    const names: Record<string, LocalizedString> = {};
    for (const line of items) names[line.product.id] = line.product.name;

    setPlacing(true);
    setCheckoutError(null);
    try {
      if (hasOrder && orderId) {
        // Existing order: extend it. Same order id, no new order.
        await addItemsToOrder(orderId, orderItems, names);
        // One quiet refresh so the tracking screen, the home bar and the totals
        // all reflect the server's recalculation. The poller keeps its own
        // schedule, so this is the only extra request the add causes.
        await refreshInBackground();
      } else {
        const request: CreateOrderRequest = {
          lang,
          TableNumber: tableNumber,
          DefaultCurrency: currency,
          TotalPrice: orderItems.reduce((sum, item) => sum + item.TotalPrice, 0),
          Notes: null,
          orderItems,
        };
        // The create endpoint answers with the same tracking payload as the
        // refresh endpoint, already normalised: orderId, orderNumber,
        // tableNumber and the server's own status step.
        const created = await submitOrder({
          items: orderItems,
          tableNumber,
          currency,
          lang,
        });
        // Hand the created order to the mock read layer (no-op in real mode).
        trackCreatedOrder(request, created.orderId, names);
        registerOrder({
          orderId: created.orderId,
          // The server echoes the table it actually stored; fall back to the
          // client's value only if that field ever comes back empty.
          tableNumber: created.tableNumber || tableNumber,
          currency,
          statusId: created.currentStatus.id,
          statusCode: created.currentStatus.code,
          statusName: created.currentStatus.name,
          statusColor: created.currentStatus.color,
        });
      }
      clearCart();
      setCartOpen(false);
      // Success goes to the tracking page, never to a "new order" screen.
      navigate('/order');
    } catch (error) {
      if (error instanceof ApiError) {
        // 409 is the server refusing to modify a closed order.
        if (error.status === 409) setCheckoutError(t('orderClosedCannotAdd'));
        else if ([422, 410].includes(error.status)) setCheckoutError(t('checkoutProductChanged'));
        else setCheckoutError(t('checkoutFailed'));
      } else {
        setCheckoutError(t('checkoutFailed'));
      }
      await refetch();
    } finally {
      setPlacing(false);
    }
  }, [
    tableId,
    tableToken,
    tableNumber,
    placing,
    items,
    currency,
    lang,
    hasOrder,
    isFinal,
    orderId,
    clearCart,
    navigate,
    registerOrder,
    refetch,
    t,
  ]);

  const handleCategorySelect = useCallback((id: string) => {
    setActiveCategory(id);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Fall back to the first category until the user picks one, and self-heal if
  // the active category disappears (e.g. after a refetch or a language switch).
  const firstCategoryId = categories[0]?.id ?? null;
  const activeCategoryId =
    activeCategory && categories.some((c) => c.id === activeCategory)
      ? activeCategory
      : firstCategoryId;

  // Subscribing to the same store the grid uses. This is a store read, not a
  // second fetch: `ensureMenuItems` is keyed per (lang, category, currency) and
  // the grid has already primed it, so opening or closing the sheet costs
  // nothing.
  const menuScope = activeCategoryId === ALL_CATEGORY_ID ? null : activeCategoryId;
  const { status: menuStatus, items: menuItems } = useMenuItems(menuScope);

  const selectedItem = useMemo(
    () => (selectedItemId ? menuItems.find((item) => item.id === selectedItemId) ?? null : null),
    [menuItems, selectedItemId],
  );

  // The product left the menu (unpublished, or the category changed under it).
  // Held open while a refetch is in flight so a transient empty snapshot does
  // not slam the sheet shut, then closed once the load settles without it.
  useEffect(() => {
    if (!detailOpen || !selectedItemId) return;
    if (menuStatus !== 'ready' || selectedItem) return;
    setDetailOpen(false);
    setSelectedItemId(null);
  }, [detailOpen, selectedItemId, menuStatus, selectedItem]);

  if (tableStatus === 'invalid') {
    return <InvalidTableScreen onContinue={dismissInvalid} />;
  }

  if (route === '/order') {
    return (
      <div className="relative flex h-full flex-col overflow-hidden bg-gray-50">
        {/* The session has no order (cleared, or 404/403 from the API). Spec is
            to return to the menu rather than sit on a dead /order URL. */}
        <ReturnToMenu />
        <Suspense fallback={null}>
          <OrderTrackingPage />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gray-50">
      <Header />

      <CategoryTabs activeCategory={activeCategoryId} onSelect={handleCategorySelect} />

      <main
        ref={contentRef}
        className="sheet-scroll min-h-0 flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+9.5rem)]"
      >
        <MenuItemsGrid activeCategoryId={activeCategoryId} onItemClick={handleItemClick} />
      </main>

      {/*
        Both bars are stacked when the session has an order *and* the cart has
        items: the tracking bar never disappears (not even on a final status),
        and the cart bar switches to "add N items to my order".
      */}
      {hasOrder && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] z-40 flex justify-center px-4">
          <div className="w-full max-w-[480px] [&>div]:relative [&>div]:bottom-0 [&>div]:pb-0">
            <OrderTrackingBar order={tracking} onClick={() => navigate('/order')} />
          </div>
        </div>
      )}

      <CartBar hasOrder={hasOrder} onClick={() => setCartOpen(true)} />

      {/* Full-screen while the request is in flight; also blocks a double tap. */}
      <OrderProcessingOverlay show={placing} />

      <Suspense fallback={null}>
        <MenuItemDetailSheet
          item={selectedItem}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
        />
        <CartBottomSheet
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          onConfirmOrder={handleConfirmOrder}
          placing={placing}
          checkoutError={checkoutError}
          hasOrder={hasOrder}
          canAddItems={canAddItems}
          orderNumber={tracking?.orderNumber ?? null}
        />
      </Suspense>
    </div>
  );
}

/**
 * Sends the customer back to the menu once the session has no order.
 *
 * Rendered only on `/order`, so it costs nothing on the menu itself. The
 * `orderId` check is safe on first paint because the store reads the persisted
 * id synchronously — there is no window where a valid stored order looks absent.
 */
function ReturnToMenu() {
  const { orderId } = useSessionOrder();
  useEffect(() => {
    if (!orderId) navigate('/', { replace: true });
  }, [orderId]);
  return null;
}

export default function App() {
  return (
    <TenantProvider>
      <TableProvider>
        <CurrencyProvider>
          <CartProvider>
            <SessionOrderProvider>
              <MenuApp />
            </SessionOrderProvider>
          </CartProvider>
        </CurrencyProvider>
      </TableProvider>
    </TenantProvider>
  );
}