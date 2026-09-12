import { useState, useCallback } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { TableProvider } from '@/contexts/TableContext';
import { Header } from '@/components/Header';
import { CategoryTabs } from '@/components/CategoryTabs';
import { MenuGrid } from '@/components/MenuGrid';
import { ProductDetailSheet } from '@/components/ProductDetailSheet';
import { CartBar } from '@/components/CartBar';
import { CartSheet } from '@/components/CartSheet';
import { OrderConfirmation } from '@/components/OrderConfirmation';
import { TableModal } from '@/components/TableModal';
import type { Product } from '@/types';

function MenuApp() {
  const { clearCart } = useCart();
  const [activeCategory, setActiveCategory] = useState('promos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  const handleProductClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    setDetailOpen(true);
  }, []);

  const handlePlaceOrder = useCallback(() => {
    setCartOpen(false);
    setOrderConfirmed(true);
  }, []);

  const handleNewOrder = useCallback(() => {
    setOrderConfirmed(false);
    clearCart();
    setActiveCategory('promos');
  }, [clearCart]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onTableClick={() => setTableModalOpen(true)} />

      <CategoryTabs activeCategory={activeCategory} onSelect={setActiveCategory} />

      <main className="mx-auto max-w-2xl pb-24">
        <MenuGrid activeCategory={activeCategory} onProductClick={handleProductClick} />
      </main>

      <CartBar onClick={() => setCartOpen(true)} />

      <ProductDetailSheet
        product={selectedProduct}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onPlaceOrder={handlePlaceOrder}
      />

      <TableModal open={tableModalOpen} onClose={() => setTableModalOpen(false)} />

      <OrderConfirmation open={orderConfirmed} onNewOrder={handleNewOrder} />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <TableProvider>
        <CartProvider>
          <MenuApp />
        </CartProvider>
      </TableProvider>
    </LanguageProvider>
  );
}
