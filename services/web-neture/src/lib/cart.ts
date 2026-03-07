/**
 * Cart Utility — WO-O4O-STORE-CART-PAGE-V1
 *
 * localStorage 기반 프론트엔드 전용 카트.
 * 백엔드 카트 테이블 없음 — 주문 시 서버 가격 강제 (클라이언트 가격 표시용).
 */

import { useState, useMemo, useCallback } from 'react';

// ==================== Types ====================

export interface CartItem {
  offerId: string;        // SupplierProductOffer.id (= product_id for order)
  name: string;
  imageUrl: string | null;
  priceGeneral: number;   // 표시용 — 서버에서 강제 재계산
  quantity: number;
  supplierId: string;
  supplierName: string;
}

export interface SupplierGroup {
  supplierName: string;
  items: CartItem[];
}

// ==================== localStorage Helpers ====================

const CART_KEY = 'neture-store-cart';

export function getCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity = 1): void {
  const cart = getCart();
  const existing = cart.find((c) => c.offerId === item.offerId);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, 1000);
  } else {
    cart.push({ ...item, quantity: Math.min(quantity, 1000) });
  }
  saveCart(cart);
}

export function updateQuantity(offerId: string, quantity: number): void {
  const cart = getCart();
  if (quantity <= 0) {
    saveCart(cart.filter((c) => c.offerId !== offerId));
    return;
  }
  const item = cart.find((c) => c.offerId === offerId);
  if (item) {
    item.quantity = Math.min(quantity, 1000);
    saveCart(cart);
  }
}

export function removeFromCart(offerId: string): void {
  saveCart(getCart().filter((c) => c.offerId !== offerId));
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
}

export function clearSupplierItems(supplierId: string): void {
  saveCart(getCart().filter((c) => c.supplierId !== supplierId));
}

// ==================== React Hook ====================

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => getCart());

  const sync = useCallback((updater: (prev: CartItem[]) => CartItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      saveCart(next);
      return next;
    });
  }, []);

  const add = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    sync((prev) => {
      const cart = [...prev];
      const existing = cart.find((c) => c.offerId === item.offerId);
      if (existing) {
        existing.quantity = Math.min(existing.quantity + quantity, 1000);
      } else {
        cart.push({ ...item, quantity: Math.min(quantity, 1000) });
      }
      return cart;
    });
  }, [sync]);

  const updateQty = useCallback((offerId: string, quantity: number) => {
    sync((prev) => {
      if (quantity <= 0) return prev.filter((c) => c.offerId !== offerId);
      return prev.map((c) => c.offerId === offerId ? { ...c, quantity: Math.min(quantity, 1000) } : c);
    });
  }, [sync]);

  const remove = useCallback((offerId: string) => {
    sync((prev) => prev.filter((c) => c.offerId !== offerId));
  }, [sync]);

  const removeSupplier = useCallback((supplierId: string) => {
    sync((prev) => prev.filter((c) => c.supplierId !== supplierId));
  }, [sync]);

  const clear = useCallback(() => {
    setItems([]);
    localStorage.removeItem(CART_KEY);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, SupplierGroup>();
    for (const item of items) {
      const group = map.get(item.supplierId);
      if (group) {
        group.items.push(item);
      } else {
        map.set(item.supplierId, { supplierName: item.supplierName, items: [item] });
      }
    }
    return map;
  }, [items]);

  const totalAmount = useMemo(() => items.reduce((sum, i) => sum + i.priceGeneral * i.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  return { items, grouped, add, updateQty, remove, removeSupplier, clear, totalAmount, itemCount };
}
