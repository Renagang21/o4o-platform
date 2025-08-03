import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Cart, CartItem, Product } from '@o4o/types';
import { authClient } from '@o4o/auth-client';

interface CartStore {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchCart: () => Promise<void>;
  addToCart: (product: Product, quantity: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  
  // Local actions (for offline support)
  setCart: (cart: Cart | null) => void;
  optimisticAddToCart: (product: Product, quantity: number) => void;
  optimisticUpdateQuantity: (itemId: string, quantity: number) => void;
  optimisticRemoveFromCart: (itemId: string) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cart: null,
      isLoading: false,
      error: null,

      fetchCart: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await authClient.api.get('/cart');
          set({ cart: response.data, isLoading: false });
        } catch (error: any) {
          const message = error instanceof Error ? error.message : 'Failed to fetch cart';
          set({ error: message, isLoading: false });
        }
      },

      addToCart: async (product: Product, quantity: number) => {
        const { optimisticAddToCart } = get();
        
        // Optimistic update
        optimisticAddToCart(product, quantity);
        
        try {
          await authClient.api.post('/cart/items', {
            productId: product.id,
            quantity
          });
          
          // Refresh cart to get server state
          await get().fetchCart();
        } catch (error: any) {
          // Revert on error
          await get().fetchCart();
          throw error;
        }
      },

      updateQuantity: async (itemId: string, quantity: number) => {
        const { optimisticUpdateQuantity } = get();
        
        // Optimistic update
        optimisticUpdateQuantity(itemId, quantity);
        
        try {
          await authClient.api.patch(`/cart/items/${itemId}`, { quantity });
          // Refresh cart to get server state
          await get().fetchCart();
        } catch (error: any) {
          // Revert on error
          await get().fetchCart();
          throw error;
        }
      },

      removeFromCart: async (itemId: string) => {
        const { optimisticRemoveFromCart } = get();
        
        // Optimistic update
        optimisticRemoveFromCart(itemId);
        
        try {
          await authClient.api.delete(`/cart/items/${itemId}`);
          // Refresh cart to get server state
          await get().fetchCart();
        } catch (error: any) {
          // Revert on error
          await get().fetchCart();
          throw error;
        }
      },

      clearCart: async () => {
        set({ cart: null });
        try {
          await authClient.api.delete('/cart');
          set({ cart: null });
        } catch (error: any) {
          await get().fetchCart();
          throw error;
        }
      },

      setCart: (cart) => set({ cart }),

      optimisticAddToCart: (product, quantity) => {
        const { cart } = get();
        if (!cart) {
          // Create new cart
          const newCart: Cart = {
            id: 'temp-' + Date.now(),
            userId: 'current-user',
            items: [{
              id: 'temp-item-' + Date.now(),
              cartId: 'temp-' + Date.now(),
              productId: product.id,
              product,
              quantity,
              unitPrice: product.pricing.customer,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }],
            summary: {
              subtotal: product.pricing.customer * quantity,
              discount: 0,
              shipping: 0,
              tax: 0,
              total: product.pricing.customer * quantity
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          set({ cart: newCart });
        } else {
          // Check if product already in cart
          const existingItem = cart.items.find((item: any) => item.productId === product.id);
          
          if (existingItem) {
            // Update quantity
            const updatedItems = cart.items.map((item: any) =>
              item.id === existingItem.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            );
            // 새로운 summary 계산
            const newSubtotal = updatedItems.reduce((sum: any, item: any) => {
              const price = item.unitPrice || item.product?.pricing.customer || 0;
              return sum + (price * item.quantity);
            }, 0);
            
            set({ 
              cart: { 
                ...cart, 
                items: updatedItems,
                summary: {
                  ...cart.summary,
                  subtotal: newSubtotal,
                  total: newSubtotal + cart.summary.shipping + cart.summary.tax - cart.summary.discount
                }
              } 
            });
          } else {
            // Add new item
            const newItem: CartItem = {
              id: 'temp-item-' + Date.now(),
              cartId: cart.id,
              productId: product.id,
              product,
              quantity,
              unitPrice: product.pricing.customer,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            // 새로운 summary 계산
            const newItems = [...cart.items, newItem];
            const newSubtotal = newItems.reduce((sum: any, item: any) => {
              const price = item.unitPrice || item.product?.pricing.customer || 0;
              return sum + (price * item.quantity);
            }, 0);
            
            set({ 
              cart: { 
                ...cart, 
                items: newItems,
                summary: {
                  ...cart.summary,
                  subtotal: newSubtotal,
                  total: newSubtotal + cart.summary.shipping + cart.summary.tax - cart.summary.discount
                }
              } 
            });
          }
        }
      },

      optimisticUpdateQuantity: (itemId, quantity) => {
        const { cart } = get();
        if (!cart) return;
        
        const updatedItems = cart.items.map((item: any) =>
          item.id === itemId ? { ...item, quantity } : item
        );
        set({ cart: { ...cart, items: updatedItems } });
      },

      optimisticRemoveFromCart: (itemId) => {
        const { cart } = get();
        if (!cart) return;
        
        const updatedItems = cart.items.filter((item: any) => item.id !== itemId);
        set({ cart: { ...cart, items: updatedItems } });
      }
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ cart: state.cart }) // Only persist cart data
    }
  )
);