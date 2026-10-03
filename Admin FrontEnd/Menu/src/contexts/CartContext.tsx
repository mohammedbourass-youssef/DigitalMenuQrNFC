import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { Product, CartItem } from '../types';
import type { CurrencyCode } from '../lib/constants';
import { tenantScopedKey } from '../lib/tenant';
import { storageGet, storageSet } from '../lib/storage';
import { useLanguage } from './LanguageContext';
import { useCurrency } from './CurrencyContext';
import { loadAllMenuItems } from '../lib/menuItemsStore';
import { toCartProduct } from '../types/menuItem';

interface StoredCartItem {
  product: Product;
  quantity: number;
}

const CART_KEY = tenantScopedKey('cart');

/**
 * Gallery URLs are time-limited signed links, so they must not outlive the
 * session in local storage. They are dropped on write and refilled from a fresh
 * menu fetch on load (see the re-pricing effect below).
 */
function toStoredCartItem(item: CartItem): StoredCartItem {
  return {
    quantity: item.quantity,
    product: { ...item.product, gallery: [] },
  };
}

interface CartContextValue {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  /**
   * Currency the cart's prices are denominated in. Taken from the items
   * themselves, because the menu API prices them per requested currency.
   * Callers must format totals with this, not with the tenant's currency.
   */
  cartCurrency: CurrencyCode | null;
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

  // Mirrors `items` for async callbacks, so the re-pricing effect below can
  // read the current cart without listing `items` as a dependency (which would
  // re-run it on every add/remove).
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    storageSet(CART_KEY, items.map(toStoredCartItem));
  }, [items]);

  // Prices are denominated in the currency the menu was requested in, so
  // switching currency has to re-price what is already in the cart — otherwise
  // the totals keep the previous currency's numbers. The full menu is fetched
  // because the cart can span several categories, and only the active
  // category's slice is otherwise loaded.
  const { lang } = useLanguage();
  const { displayCurrency } = useCurrency();

  useEffect(() => {
    if (itemsRef.current.length === 0) return;
    let cancelled = false;

    void loadAllMenuItems(lang, displayCurrency).then((menuItems) => {
      if (cancelled || menuItems.length === 0) return;
      const fresh = new Map(menuItems.map((item) => [item.id, item]));

      setItems((prev) => {
        let changed = false;
        const next = prev.map((item) => {
          const dto = fresh.get(item.product.id);
          if (!dto) return item;
          const updated = toCartProduct(dto);
          // Also carries the refreshed gallery: it was stripped from storage on
          // write, so a reload lands here with empty URLs to repopulate.
          if (
            updated.price === item.product.price &&
            updated.currencyCode === item.product.currencyCode &&
            updated.gallery.length === item.product.gallery.length &&
            updated.image === item.product.image
          ) {
            return item;
          }
          changed = true;
          return {
            ...item,
            product: {
              ...item.product,
              price: updated.price,
              promo: updated.promo,
              currencyCode: updated.currencyCode,
              image: updated.image,
              gallery: updated.gallery,
              preparationTimeMinutes: updated.preparationTimeMinutes,
              isFeatured: updated.isFeatured,
            },
          };
        });
        return changed ? next : prev;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [lang, displayCurrency]);

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

  // Every item comes from the same menu response, so they share one currency.
  // Legacy stored items predate `currencyCode`, hence the null.
  const cartCurrency = items.find((item) => item.product.currencyCode)?.product.currencyCode ?? null;

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
        cartCurrency,
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