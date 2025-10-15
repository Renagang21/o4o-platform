import { useState, useEffect, useCallback } from 'react';
import { cartService, Cart, CartItem } from '../services/cartService';
import { useAuth } from '../contexts/AuthContext';

interface UseCartReturn {
  cart: Cart | null;
  loading: boolean;
  error: Error | null;
  addToCart: (productId: string, quantity?: number, variantId?: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
}

export const useCart = (): UseCartReturn => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load cart on mount and auth change
  useEffect(() => {
    loadCart();
  }, [isAuthenticated]);

  const loadCart = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (isAuthenticated) {
        const cartData = await cartService.getCart();
        setCart(cartData);
      } else {
        // Load from localStorage for guest users
        const localCart = localStorage.getItem('guestCart');
        if (localCart) {
          const parsedCart = JSON.parse(localCart);
          setCart(parsedCart);
        } else {
          setCart({
            id: 'guest',
            items: [],
            totalItems: 0,
            totalPrice: 0
          });
        }
      }
    } catch (err) {
      console.error('Failed to load cart:', err);
      setError(err instanceof Error ? err : new Error('Failed to load cart'));
      setCart({
        id: 'error',
        items: [],
        totalItems: 0,
        totalPrice: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const saveGuestCart = (newCart: Cart) => {
    if (!isAuthenticated) {
      localStorage.setItem('guestCart', JSON.stringify(newCart));
    }
  };

  const addToCart = useCallback(async (productId: string, quantity = 1, variantId?: string) => {
    try {
      setError(null);
      
      if (isAuthenticated) {
        const updatedCart = await cartService.addToCart(productId, quantity, variantId);
        setCart(updatedCart);
      } else {
        // Handle guest cart locally
        const currentCart = cart || {
          id: 'guest',
          items: [],
          totalItems: 0,
          totalPrice: 0
        };
        
        // Mock adding to cart (would need product details from API)
        const newItem: CartItem = {
          id: `guest-${Date.now()}`,
          productId,
          name: 'Product', // Would fetch from API
          price: 0, // Would fetch from API
          quantity,
          variantId
        };
        
        const updatedCart = {
          ...currentCart,
          items: [...currentCart.items, newItem],
          totalItems: currentCart.totalItems + quantity,
          totalPrice: currentCart.totalPrice + (newItem.price * quantity)
        };
        
        setCart(updatedCart);
        saveGuestCart(updatedCart);
      }
    } catch (err) {
      console.error('Failed to add item to cart:', err);
      setError(err instanceof Error ? err : new Error('Failed to add item'));
      throw err;
    }
  }, [isAuthenticated, cart]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    try {
      setError(null);
      
      if (isAuthenticated) {
        const updatedCart = await cartService.updateQuantity(itemId, quantity);
        setCart(updatedCart);
      } else {
        // Handle guest cart locally
        if (!cart) return;
        
        if (quantity <= 0) {
          return removeItem(itemId);
        }
        
        const updatedItems = cart.items.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        );
        
        const updatedCart = {
          ...cart,
          items: updatedItems,
          totalItems: updatedItems.reduce((acc, item) => acc + item.quantity, 0),
          totalPrice: updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
        };
        
        setCart(updatedCart);
        saveGuestCart(updatedCart);
      }
    } catch (err) {
      console.error('Failed to update quantity:', err);
      setError(err instanceof Error ? err : new Error('Failed to update quantity'));
      throw err;
    }
  }, [isAuthenticated, cart]);

  const removeItem = useCallback(async (itemId: string) => {
    try {
      setError(null);
      
      if (isAuthenticated) {
        const updatedCart = await cartService.removeItem(itemId);
        setCart(updatedCart);
      } else {
        // Handle guest cart locally
        if (!cart) return;
        
        const updatedItems = cart.items.filter(item => item.id !== itemId);
        
        const updatedCart = {
          ...cart,
          items: updatedItems,
          totalItems: updatedItems.reduce((acc, item) => acc + item.quantity, 0),
          totalPrice: updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
        };
        
        setCart(updatedCart);
        saveGuestCart(updatedCart);
      }
    } catch (err) {
      console.error('Failed to remove item:', err);
      setError(err instanceof Error ? err : new Error('Failed to remove item'));
      throw err;
    }
  }, [isAuthenticated, cart]);

  const clearCart = useCallback(async () => {
    try {
      setError(null);
      
      if (isAuthenticated) {
        const clearedCart = await cartService.clearCart();
        setCart(clearedCart);
      } else {
        const clearedCart = {
          id: 'guest',
          items: [],
          totalItems: 0,
          totalPrice: 0
        };
        setCart(clearedCart);
        localStorage.removeItem('guestCart');
      }
    } catch (err) {
      console.error('Failed to clear cart:', err);
      setError(err instanceof Error ? err : new Error('Failed to clear cart'));
      throw err;
    }
  }, [isAuthenticated]);

  const refreshCart = useCallback(async () => {
    await loadCart();
  }, [isAuthenticated]);

  return {
    cart,
    loading,
    error,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart,
    totalItems: cart?.totalItems || 0,
    totalPrice: cart?.totalPrice || 0
  };
};