import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCartStore } from '@/stores/useCartStore';

// Use cart store
export const useCart = () => {
  const cart = useCartStore(state => state.cart);
  const isLoading = useCartStore(state => state.isLoading);
  const error = useCartStore(state => state.error);
  const fetchCart = useCartStore(state => state.fetchCart);
  
  // Fetch cart on mount
  useQuery({
    queryKey: ['cart-init'],
    queryFn: fetchCart,
    staleTime: Infinity // Cart is managed by store
  });
  
  return { cart, isLoading, error, refetch: fetchCart };
};

// Update cart item quantity
export const useUpdateCartQuantity = () => {
  const updateQuantity = useCartStore(state => state.updateQuantity);
  
  return useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      await updateQuantity(itemId, quantity);
    }
  });
};

// Remove from cart
export const useRemoveFromCart = () => {
  const removeFromCart = useCartStore(state => state.removeFromCart);
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      await removeFromCart(itemId);
    }
  });
};

// Clear cart
export const useClearCart = () => {
  const clearCart = useCartStore(state => state.clearCart);
  
  return useMutation({
    mutationFn: clearCart
  });
};

// Apply coupon
export const useApplyCoupon = () => {
  return useMutation({
    mutationFn: async (couponCode: string) => {
      return api.cart.applyCoupon(couponCode);
    }
  });
};

// Calculate shipping
export const useCalculateShipping = () => {
  return useMutation({
    mutationFn: async (address: { postalCode: string; city?: string; state?: string }) => {
      return api.cart.calculateShipping(address);
    }
  });
};