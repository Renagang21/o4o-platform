/**
 * Wishlist Service
 * R-6-6: Frontend service for wishlist operations
 *
 * Integrates with backend wishlist API (R-6-5)
 */

import { authClient } from '@o4o/auth-client';

export interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  addedAt: string;
  notes?: string;
}

class WishlistService {
  private baseUrl = '/api/v1/customer/wishlist';

  /**
   * Get all wishlist items
   * GET /api/v1/customer/wishlist
   */
  async getWishlistItems(): Promise<WishlistItem[]> {
    try {
      const response = await authClient.api.get(this.baseUrl);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Get wishlist count
   * GET /api/v1/customer/wishlist/count
   */
  async getWishlistCount(): Promise<number> {
    try {
      const response = await authClient.api.get(`${this.baseUrl}/count`);
      return response.data.data.count || 0;
    } catch (error) {
      console.error('Failed to fetch wishlist count:', error);
      return 0;
    }
  }

  /**
   * Check if product is in wishlist
   * GET /api/v1/customer/wishlist/check/:productId
   */
  async isInWishlist(productId: string): Promise<boolean> {
    try {
      const response = await authClient.api.get(`${this.baseUrl}/check/${productId}`);
      return response.data.data.inWishlist || false;
    } catch (error) {
      console.error('Failed to check wishlist status:', error);
      return false;
    }
  }

  /**
   * Add product to wishlist
   * POST /api/v1/customer/wishlist
   */
  async addToWishlist(productId: string, notes?: string): Promise<void> {
    try {
      await authClient.api.post(this.baseUrl, {
        productId,
        notes
      });
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      throw error;
    }
  }

  /**
   * Remove product from wishlist
   * DELETE /api/v1/customer/wishlist/:productId
   */
  async removeFromWishlist(productId: string): Promise<void> {
    try {
      await authClient.api.delete(`${this.baseUrl}/${productId}`);
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const wishlistService = new WishlistService();
export default wishlistService;
