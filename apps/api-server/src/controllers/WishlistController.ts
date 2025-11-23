/**
 * Wishlist Controller
 * R-6-5: Wishlist & Reward Points - Customer wishlist endpoints
 *
 * Provides wishlist CRUD operations for authenticated customers
 */

import { Request, Response } from 'express';
import { WishlistService } from '../services/WishlistService.js';
import { createDashboardError } from '../dto/dashboard.dto.js';
import logger from '../utils/logger.js';

export class WishlistController {
  private wishlistService = new WishlistService();

  /**
   * POST /api/v1/customer/wishlist
   * Add a product to wishlist
   * R-6-5: Validates product existence, prevents duplicates
   *
   * Body:
   * - productId: string (required)
   * - notes: string (optional)
   */
  async addToWishlist(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json(
          createDashboardError('UNAUTHORIZED', 'Authentication required')
        );
        return;
      }

      const { productId, notes } = req.body;

      if (!productId) {
        res.status(400).json(
          createDashboardError('INVALID_PARAMS', 'productId is required')
        );
        return;
      }

      const wishlistItem = await this.wishlistService.addToWishlist(
        userId,
        productId,
        notes
      );

      res.status(201).json({
        success: true,
        data: {
          id: wishlistItem.id,
          productId: wishlistItem.productId,
          addedAt: wishlistItem.createdAt.toISOString()
        }
      });
    } catch (error: any) {
      logger.error('[WishlistController] Error adding to wishlist:', error);

      // Handle specific errors
      if (error.message === 'Product not found') {
        res.status(404).json(
          createDashboardError('NOT_FOUND', 'Product not found')
        );
        return;
      }

      res.status(500).json(
        createDashboardError(
          'SERVER_ERROR',
          'Failed to add to wishlist',
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  }

  /**
   * DELETE /api/v1/customer/wishlist/:productId
   * Remove a product from wishlist
   * R-6-5: Idempotent operation
   */
  async removeFromWishlist(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json(
          createDashboardError('UNAUTHORIZED', 'Authentication required')
        );
        return;
      }

      const { productId } = req.params;

      if (!productId) {
        res.status(400).json(
          createDashboardError('INVALID_PARAMS', 'productId is required')
        );
        return;
      }

      const removed = await this.wishlistService.removeFromWishlist(
        userId,
        productId
      );

      res.json({
        success: true,
        data: {
          removed,
          message: removed ? 'Product removed from wishlist' : 'Product was not in wishlist'
        }
      });
    } catch (error: any) {
      logger.error('[WishlistController] Error removing from wishlist:', error);

      res.status(500).json(
        createDashboardError(
          'SERVER_ERROR',
          'Failed to remove from wishlist',
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  }

  /**
   * GET /api/v1/customer/wishlist
   * Get all wishlist items
   * R-6-5: Returns detailed product information
   */
  async getWishlistItems(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json(
          createDashboardError('UNAUTHORIZED', 'Authentication required')
        );
        return;
      }

      const items = await this.wishlistService.getWishlistItems(userId);

      res.json({
        success: true,
        data: items
      });
    } catch (error: any) {
      logger.error('[WishlistController] Error fetching wishlist:', error);

      res.status(500).json(
        createDashboardError(
          'SERVER_ERROR',
          'Failed to fetch wishlist',
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  }

  /**
   * GET /api/v1/customer/wishlist/count
   * Get wishlist item count
   * R-6-5: Lightweight endpoint for badge displays
   */
  async getWishlistCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json(
          createDashboardError('UNAUTHORIZED', 'Authentication required')
        );
        return;
      }

      const count = await this.wishlistService.countWishlistItems(userId);

      res.json({
        success: true,
        data: { count }
      });
    } catch (error: any) {
      logger.error('[WishlistController] Error counting wishlist:', error);

      res.status(500).json(
        createDashboardError(
          'SERVER_ERROR',
          'Failed to count wishlist items',
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  }

  /**
   * GET /api/v1/customer/wishlist/check/:productId
   * Check if product is in wishlist
   * R-6-5: Helper for product detail pages
   */
  async checkWishlistStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json(
          createDashboardError('UNAUTHORIZED', 'Authentication required')
        );
        return;
      }

      const { productId } = req.params;

      if (!productId) {
        res.status(400).json(
          createDashboardError('INVALID_PARAMS', 'productId is required')
        );
        return;
      }

      const inWishlist = await this.wishlistService.isInWishlist(userId, productId);

      res.json({
        success: true,
        data: { inWishlist }
      });
    } catch (error: any) {
      logger.error('[WishlistController] Error checking wishlist status:', error);

      res.status(500).json(
        createDashboardError(
          'SERVER_ERROR',
          'Failed to check wishlist status',
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  }
}
