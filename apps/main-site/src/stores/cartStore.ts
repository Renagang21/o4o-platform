/**
 * Cart Store (Zustand)
 * Phase 5-1: Shopping Cart State Management
 * R-6-7-A: Removed alert(), actions now return validation results
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Cart } from '../types/storefront';

/**
 * Cart action result
 */
export interface CartActionResult {
  success: boolean;
  error?: string;
  errorCode?: 'OUT_OF_STOCK' | 'INVALID_QUANTITY' | 'NOT_FOUND';
}

interface CartStore extends Cart {
  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => CartActionResult;
  removeItem: (productId: string) => CartActionResult;
  updateQuantity: (productId: string, quantity: number) => CartActionResult;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
}

// 장바구니 총액 계산
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// 총 아이템 수 계산
function calculateTotalItems(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      total_items: 0,
      total_amount: 0,
      currency: 'KRW',

      // Add item to cart
      addItem: (item, quantity = 1) => {
        const state = get();
        const existingItemIndex = state.items.findIndex(
          (i) => i.product_id === item.product_id
        );

        let newItems: CartItem[];

        if (existingItemIndex >= 0) {
          // 이미 있는 상품: 수량 증가
          newItems = [...state.items];
          const newQuantity = newItems[existingItemIndex].quantity + quantity;

          // 재고 체크
          if (newQuantity > item.available_stock) {
            return {
              success: false,
              error: `재고가 부족합니다. (최대 ${item.available_stock}개)`,
              errorCode: 'OUT_OF_STOCK' as const,
            };
          }

          newItems[existingItemIndex] = {
            ...newItems[existingItemIndex],
            quantity: newQuantity,
          };
        } else {
          // 새로운 상품: 추가
          if (quantity > item.available_stock) {
            return {
              success: false,
              error: `재고가 부족합니다. (최대 ${item.available_stock}개)`,
              errorCode: 'OUT_OF_STOCK' as const,
            };
          }

          newItems = [
            ...state.items,
            {
              ...item,
              quantity,
            },
          ];
        }

        set({
          items: newItems,
          total_items: calculateTotalItems(newItems),
          total_amount: calculateTotal(newItems),
          currency: 'KRW',
        });

        return { success: true };
      },

      // Remove item from cart
      removeItem: (productId) => {
        const state = get();
        const itemExists = state.items.some((i) => i.product_id === productId);

        if (!itemExists) {
          return {
            success: false,
            error: '상품을 찾을 수 없습니다.',
            errorCode: 'NOT_FOUND' as const,
          };
        }

        const newItems = state.items.filter((i) => i.product_id !== productId);

        set({
          items: newItems,
          total_items: calculateTotalItems(newItems),
          total_amount: calculateTotal(newItems),
          currency: 'KRW',
        });

        return { success: true };
      },

      // Update item quantity
      updateQuantity: (productId, quantity) => {
        const state = get();

        if (quantity < 0) {
          return {
            success: false,
            error: '유효하지 않은 수량입니다.',
            errorCode: 'INVALID_QUANTITY' as const,
          };
        }

        if (quantity === 0) {
          // 수량이 0이면 삭제
          return get().removeItem(productId);
        }

        const item = state.items.find((i) => i.product_id === productId);

        if (!item) {
          return {
            success: false,
            error: '상품을 찾을 수 없습니다.',
            errorCode: 'NOT_FOUND' as const,
          };
        }

        // 재고 체크
        if (quantity > item.available_stock) {
          return {
            success: false,
            error: `재고가 부족합니다. (최대 ${item.available_stock}개)`,
            errorCode: 'OUT_OF_STOCK' as const,
          };
        }

        const newItems = state.items.map((i) =>
          i.product_id === productId ? { ...i, quantity } : i
        );

        set({
          items: newItems,
          total_items: calculateTotalItems(newItems),
          total_amount: calculateTotal(newItems),
          currency: 'KRW',
        });

        return { success: true };
      },

      // Clear cart
      clearCart: () => {
        set({
          items: [],
          total_items: 0,
          total_amount: 0,
          currency: 'KRW',
        });
      },

      // Get item quantity
      getItemQuantity: (productId) => {
        const item = get().items.find((i) => i.product_id === productId);
        return item ? item.quantity : 0;
      },
    }),
    {
      name: 'cart-storage', // sessionStorage key
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
    }
  )
);
