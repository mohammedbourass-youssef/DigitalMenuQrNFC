import { useState, useCallback, useRef, lazy, Suspense } from 'react';
import { TenantProvider } from '@/contexts/TenantContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { TableProvider, useTable } from '@/contexts/TableContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCategories, useSessionExpiryGuard } from '@/hooks/useCategories';
import { createOrder } from '@/lib/api';
import { ApiError } from '@/lib/errors';
import { Header } from '@/components/Header';
import { CategoryTabs } from '@/components/CategoryTabs';
import { MenuItemsGrid } from '@/components/MenuItemsGrid';
import { CartBar } from '@/components/CartBar';
import { InvalidTableScreen } from '@/components/InvalidTableScreen';
import type { CreateOrderPayload } from '@/types';
import type { MenuItemPublicDTO } from '@/types/menuItem';

  const MenuItemDetailSheet = lazy(() =>
    import('@/components/MenuItemDetailSheet').then((m) => ({ default: m.MenuItemDetailSheet })),
  );
const CartSheet = lazy(() => import('@/components/CartSheet').then((m) => ({ default: m.CartSheet })));
const TableModal = lazy(() => import('@/components/TableModal').then((m) => ({ default: m.TableModal })));
const OrderConfirmation = lazy(() =>
  import('@/components/OrderConfirmation').then((m) => ({ default: m.OrderConfirmation })),
);

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function MenuApp() {
  const { t } = useLanguage();
  const { items, clearCart } = useCart();
  const { tableToken, tableStatus, dismissInvalid } = useTable();
  const { categories } = useCategories();
  useSessionExpiryGuard();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItemPublicDTO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const idemKeyRef = useRef<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleItemClick = useCallback((item: MenuItemPublicDTO) => {
    setSelectedItem(item);
    setDetailOpen(true);
  }, []);

  const handlePlaceOrder = useCallback(async () => {
    if (!tableToken || placing) return;
    if (!idemKeyRef.current) idemKeyRef.current = generateIdempotencyKey();

    const payload: CreateOrderPayload = {
      tableToken,
      items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      idempotencyKey: idemKeyRef.current,
    };

    setPlacing(true);
    setCheckoutError(null);
    try {
      const order = await createOrder(payload);
      idemKeyRef.current = null;
      setCartOpen(false);
      setOrderNumber(order.number);
      setOrderConfirmed(true);
    } catch (error) {
      if (error instanceof ApiError && [409, 422, 410].includes(error.status)) {
        setCheckoutError(t('checkoutProductChanged'));
      } else {
        setCheckoutError(t('checkoutFailed'));
      }
    } finally {
      setPlacing(false);
    }
  }, [tableToken, placing, items, t]);

  const handleRetryCheckout = useCallback(() => {
    if (!tableToken || placing) return;
    void handlePlaceOrder();
  }, [tableToken, placing, handlePlaceOrder]);

  const handleNewOrder = useCallback(() => {
    setOrderConfirmed(false);
    setOrderNumber(null);
    setCheckoutError(null);
    idemKeyRef.current = null;
    clearCart();
    setActiveCategory(null);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [clearCart]);

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

  if (tableStatus === 'invalid') {
    return <InvalidTableScreen onContinue={dismissInvalid} />;
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gray-50">
      <Header onTableClick={() => setTableModalOpen(true)} />

      <CategoryTabs activeCategory={activeCategoryId} onSelect={handleCategorySelect} />

      <main
        ref={contentRef}
        className="sheet-scroll min-h-0 flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+7.5rem)]"
      >
        <MenuItemsGrid activeCategoryId={activeCategoryId} onItemClick={handleItemClick} />
      </main>

      <CartBar onClick={() => setCartOpen(true)} />

      <Suspense fallback={null}>
        <MenuItemDetailSheet
          item={selectedItem}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
        />
        <CartSheet
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          onPlaceOrder={handlePlaceOrder}
          onRetryCheckout={handleRetryCheckout}
          placing={placing}
          checkoutError={checkoutError}
        />
        <TableModal open={tableModalOpen} onClose={() => setTableModalOpen(false)} />
        <OrderConfirmation
          open={orderConfirmed}
          orderNumber={orderNumber}
          onNewOrder={handleNewOrder}
        />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <TenantProvider>
      <TableProvider>
        <CurrencyProvider>
          <CartProvider>
            <MenuApp />
          </CartProvider>
        </CurrencyProvider>
      </TableProvider>
    </TenantProvider>
  );
}