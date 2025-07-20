import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@o4o/types';
import { authClient } from '@o4o/auth-client';

interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  addedAt: string;
}

interface WishlistStore {
  items: WishlistItem[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchWishlist: () => Promise<void>;
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  
  // Local actions
  setItems: (items: WishlistItem[]) => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      error: null,

      fetchWishlist: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await authClient.api.get('/wishlist');
          set({ items: response.data.items, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch wishlist';
          set({ error: message, isLoading: false });
        }
      },

      addToWishlist: async (product: Product) => {
        const { items } = get();
        
        // Check if already in wishlist
        if (items.some(item => item.productId === product.id)) {
          return;
        }
        
        // Optimistic update
        const newItem: WishlistItem = {
          id: 'temp-' + Date.now(),
          productId: product.id,
          product,
          addedAt: new Date().toISOString()
        };
        set({ items: [...items, newItem] });
        
        try {
          const response = await authClient.api.post('/wishlist/items', {
            productId: product.id
          });
          
          // Update with server response
          const updatedItems = items.map(item =>
            item.id === newItem.id ? { ...item, id: response.data.id } : item
          );
          set({ items: updatedItems });
        } catch (error) {
          // Revert on error
          set({ items: items.filter(item => item.id !== newItem.id) });
          throw error;
        }
      },

      removeFromWishlist: async (productId: string) => {
        const { items } = get();
        const itemToRemove = items.find(item => item.productId === productId);
        
        if (!itemToRemove) return;
        
        // Optimistic update
        set({ items: items.filter(item => item.productId !== productId) });
        
        try {
          await authClient.api.delete(`/wishlist/items/${productId}`);
        } catch (error) {
          // Revert on error
          set({ items });
          throw error;
        }
      },

      clearWishlist: async () => {
        const { items } = get();
        
        // Optimistic update
        set({ items: [] });
        
        try {
          await authClient.api.delete('/wishlist');
        } catch (error) {
          // Revert on error
          set({ items });
          throw error;
        }
      },

      isInWishlist: (productId: string) => {
        return get().items.some(item => item.productId === productId);
      },

      setItems: (items) => set({ items })
    }),
    {
      name: 'wishlist-storage',
      partialize: (state) => ({ items: state.items }) // Only persist items
    }
  )
);