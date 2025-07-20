import { authClient } from '@o4o/auth-client';
import { Cart, EcommerceApiResponse } from '@o4o/types/ecommerce';

export const cartApi = {
  // Get current user's cart
  getCart: async (): Promise<Cart> => {
    const response = await authClient.api.get<Cart>('/cart');
    return response.data;
  },

  // Add item to cart
  addToCart: async (productId: string, quantity: number = 1): Promise<EcommerceApiResponse<Cart>> => {
    const response = await authClient.api.post<EcommerceApiResponse<Cart>>('/cart/items', {
      productId,
      quantity
    });
    return response.data;
  },

  // Update cart item quantity
  updateQuantity: async (itemId: string, quantity: number): Promise<EcommerceApiResponse<Cart>> => {
    const response = await authClient.api.patch<EcommerceApiResponse<Cart>>(`/cart/items/${itemId}`, {
      quantity
    });
    return response.data;
  },

  // Remove item from cart
  removeFromCart: async (itemId: string): Promise<EcommerceApiResponse<Cart>> => {
    const response = await authClient.api.delete<EcommerceApiResponse<Cart>>(`/cart/items/${itemId}`);
    return response.data;
  },

  // Clear entire cart
  clearCart: async (): Promise<EcommerceApiResponse<Cart>> => {
    const response = await authClient.api.delete<EcommerceApiResponse<Cart>>('/cart');
    return response.data;
  },

  // Apply coupon to cart
  applyCoupon: async (couponCode: string): Promise<EcommerceApiResponse<Cart>> => {
    const response = await authClient.api.post<EcommerceApiResponse<Cart>>('/cart/coupon', {
      code: couponCode
    });
    return response.data;
  },

  // Remove coupon from cart
  removeCoupon: async (): Promise<EcommerceApiResponse<Cart>> => {
    const response = await authClient.api.delete<EcommerceApiResponse<Cart>>('/cart/coupon');
    return response.data;
  },

  // Calculate shipping
  calculateShipping: async (address: {
    postalCode: string;
    city?: string;
    state?: string;
  }): Promise<{ shipping: number; methods: Record<string, unknown>[] }> => {
    const response = await authClient.api.post('/cart/shipping', address);
    return response.data;
  }
};