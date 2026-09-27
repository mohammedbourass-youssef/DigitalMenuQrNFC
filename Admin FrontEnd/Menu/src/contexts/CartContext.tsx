import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Product, CartItem } from '../types';
import { tenantScopedKey } from '../lib/tenant';
import { storageGet, storageSet } from '../lib/storage';

interface StoredCartItem {
  product: Product;
  quantity: number;
}

const CART_KEY = tenantScopedKey('cart');

interface CartContextValue {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  getProductQuantity: (productId: string) => number;
  lastAddedId: string | null;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const stored = storageGet<StoredCartItem[]>(CART_KEY, []);
    if (!Array.isArray(stored)) return [];
    return stored.filter(
      (item): item is StoredCartItem =>
        item !== null &&
        typeof item === 'object' &&
        typeof item.product?.id === 'string' &&
        typeof item.quantity === 'number' &&
        item.quantity > 0,
    );
  });
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  useEffect(() => {
    storageSet(CART_KEY, items);
  }, [items]);

  const addToCart = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...prev, { product, quantity }];
    });
    setLastAddedId(product.id);
    setTimeout(() => setLastAddedId(null), 600);
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const price = item.product.promo ? item.product.promo.oldPrice * (1 - item.product.promo.discountPercent / 100) : item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const getProductQuantity = useCallback(
    (productId: string) => {
      const item = items.find((i) => i.product.id === productId);
      return item ? item.quantity : 0;
    },
    [items],
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        getProductQuantity,
        lastAddedId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}