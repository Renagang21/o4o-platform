import { authClient } from '@o4o/auth-client';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: string;
  variantId?: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class CartService {
  private baseUrl = '/api/cart';

  /**
   * Get current user's cart
   */
  async getCart(): Promise<Cart> {
    try {
      const response = await authClient.api.get(this.baseUrl);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      // Return empty cart on error
      return {
        id: 'temp',
        items: [],
        totalItems: 0,
        totalPrice: 0
      };
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(productId: string, quantity: number = 1, variantId?: string): Promise<Cart> {
    try {
      const response = await authClient.api.post(`${this.baseUrl}/items`, {
        productId,
        quantity,
        variantId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      throw error;
    }
  }

  /**
   * Update item quantity
   */
  async updateQuantity(itemId: string, quantity: number): Promise<Cart> {
    try {
      if (quantity <= 0) {
        return this.removeItem(itemId);
      }
      
      const response = await authClient.api.patch(`${this.baseUrl}/items/${itemId}`, {
        quantity
      });
      return response.data;
    } catch (error) {
      console.error('Failed to update item quantity:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemId: string): Promise<Cart> {
    try {
      const response = await authClient.api.delete(`${this.baseUrl}/items/${itemId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to remove item from cart:', error);
      throw error;
    }
  }

  /**
   * Clear all items from cart
   */
  async clearCart(): Promise<Cart> {
    try {
      const response = await authClient.api.delete(this.baseUrl);
      return response.data;
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    }
  }

  /**
   * Get cart count (for header display)
   */
  async getCartCount(): Promise<number> {
    try {
      const response = await authClient.api.get(`${this.baseUrl}/count`);
      return response.data.count || 0;
    } catch (error) {
      console.error('Failed to fetch cart count:', error);
      return 0;
    }
  }

  /**
   * Sync local cart with server (for guest to user transition)
   */
  async syncCart(localCart: CartItem[]): Promise<Cart> {
    try {
      const response = await authClient.api.post(`${this.baseUrl}/sync`, {
        items: localCart
      });
      return response.data;
    } catch (error) {
      console.error('Failed to sync cart:', error);
      throw error;
    }
  }
}

export const cartService = new CartService();