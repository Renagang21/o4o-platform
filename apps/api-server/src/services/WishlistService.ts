/**
 * WishlistService
 * R-6-5: Wishlist & Reward Points - Customer wishlist management
 *
 * Provides wishlist CRUD operations for customers
 */

import AppDataSource from '../database/data-source.js';
import { Wishlist } from '../entities/Wishlist.js';
import { Product } from '../entities/Product.js';
import logger from '../utils/logger.js';

export interface WishlistItemDto {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  addedAt: string;
  notes?: string;
}

export class WishlistService {
  private wishlistRepository = AppDataSource.getRepository(Wishlist);
  private productRepository = AppDataSource.getRepository(Product);

  /**
   * Add a product to user's wishlist
   * R-6-5: Validates product existence, prevents duplicates
   */
  async addToWishlist(userId: string, productId: string, notes?: string): Promise<Wishlist> {
    try {
      // Validate product exists
      const product = await this.productRepository.findOne({
        where: { id: productId }
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Check if already in wishlist
      const existing = await this.wishlistRepository.findOne({
        where: { userId, productId }
      });

      if (existing) {
        // Already in wishlist, just return it (idempotent)
        return existing;
      }

      // Create new wishlist item
      const wishlistItem = this.wishlistRepository.create({
        userId,
        productId,
        notes
      });

      await this.wishlistRepository.save(wishlistItem);
      logger.info(`[WishlistService] Added product ${productId} to wishlist for user ${userId}`);

      return wishlistItem;
    } catch (error) {
      logger.error('[WishlistService] Failed to add to wishlist:', error);
      throw error;
    }
  }

  /**
   * Remove a product from user's wishlist
   * R-6-5: Idempotent operation (no error if not in wishlist)
   */
  async removeFromWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      const result = await this.wishlistRepository.delete({
        userId,
        productId
      });

      const removed = (result.affected ?? 0) > 0;

      if (removed) {
        logger.info(`[WishlistService] Removed product ${productId} from wishlist for user ${userId}`);
      }

      return removed;
    } catch (error) {
      logger.error('[WishlistService] Failed to remove from wishlist:', error);
      throw error;
    }
  }

  /**
   * Get all wishlist items for a user
   * R-6-5: Returns detailed product information
   */
  async getWishlistItems(userId: string): Promise<WishlistItemDto[]> {
    try {
      const wishlistItems = await this.wishlistRepository.find({
        where: { userId },
        relations: ['product'],
        order: { createdAt: 'DESC' }
      });

      return wishlistItems.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productPrice: Number(item.product.recommendedPrice),
        productImage: item.product.getMainImage() || undefined,
        addedAt: item.createdAt.toISOString(),
        notes: item.notes
      }));
    } catch (error) {
      logger.error('[WishlistService] Failed to get wishlist items:', error);
      throw error;
    }
  }

  /**
   * Count wishlist items for a user
   * R-6-5: Used by CustomerDashboardService
   */
  async countWishlistItems(userId: string): Promise<number> {
    try {
      const count = await this.wishlistRepository.count({
        where: { userId }
      });

      return count;
    } catch (error) {
      logger.error('[WishlistService] Failed to count wishlist items:', error);
      throw error;
    }
  }

  /**
   * Check if a product is in user's wishlist
   * R-6-5: Helper method for product detail pages
   */
  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      const count = await this.wishlistRepository.count({
        where: { userId, productId }
      });

      return count > 0;
    } catch (error) {
      logger.error('[WishlistService] Failed to check wishlist status:', error);
      throw error;
    }
  }
}
