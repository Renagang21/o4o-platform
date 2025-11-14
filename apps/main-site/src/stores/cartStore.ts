/**
 * Cart Store (Zustand)
 * Phase 5-1: Shopping Cart State Management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Cart } from '../types/storefront';

interface CartStore extends Cart {
  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
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
        set((state) => {
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
              alert(`재고가 부족합니다. (최대 ${item.available_stock}개)`);
              return state;
            }

            newItems[existingItemIndex] = {
              ...newItems[existingItemIndex],
              quantity: newQuantity,
            };
          } else {
            // 새로운 상품: 추가
            if (quantity > item.available_stock) {
              alert(`재고가 부족합니다. (최대 ${item.available_stock}개)`);
              return state;
            }

            newItems = [
              ...state.items,
              {
                ...item,
                quantity,
              },
            ];
          }

          return {
            items: newItems,
            total_items: calculateTotalItems(newItems),
            total_amount: calculateTotal(newItems),
            currency: 'KRW',
          };
        });
      },

      // Remove item from cart
      removeItem: (productId) => {
        set((state) => {
          const newItems = state.items.filter((i) => i.product_id !== productId);

          return {
            items: newItems,
            total_items: calculateTotalItems(newItems),
            total_amount: calculateTotal(newItems),
            currency: 'KRW',
          };
        });
      },

      // Update item quantity
      updateQuantity: (productId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            // 수량이 0 이하면 삭제
            const newItems = state.items.filter((i) => i.product_id !== productId);
            return {
              items: newItems,
              total_items: calculateTotalItems(newItems),
              total_amount: calculateTotal(newItems),
              currency: 'KRW',
            };
          }

          const newItems = state.items.map((item) => {
            if (item.product_id === productId) {
              // 재고 체크
              if (quantity > item.available_stock) {
                alert(`재고가 부족합니다. (최대 ${item.available_stock}개)`);
                return item;
              }
              return { ...item, quantity };
            }
            return item;
          });

          return {
            items: newItems,
            total_items: calculateTotalItems(newItems),
            total_amount: calculateTotal(newItems),
            currency: 'KRW',
          };
        });
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
