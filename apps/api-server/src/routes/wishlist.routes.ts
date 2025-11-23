/**
 * Wishlist Routes
 * R-6-5: Wishlist & Reward Points - Customer wishlist endpoints
 *
 * Provides wishlist CRUD operations for authenticated customers
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { body, param } from 'express-validator';
import { authenticateCookie, AuthRequest } from '../middleware/auth.middleware.js';
import { WishlistController } from '../controllers/WishlistController.js';
import logger from '../utils/logger.js';

const router: ExpressRouter = Router();
const wishlistController = new WishlistController();

/**
 * POST /api/v1/customer/wishlist
 * Add a product to wishlist
 * R-6-5: Validates product existence, prevents duplicates
 *
 * Body:
 * - productId: string (required, UUID)
 * - notes: string (optional)
 */
router.post(
  '/',
  authenticateCookie,
  body('productId').isUUID().withMessage('productId must be a valid UUID'),
  body('notes').optional().isString(),
  async (req: AuthRequest, res: Response) => {
    await wishlistController.addToWishlist(req, res);
  }
);

/**
 * DELETE /api/v1/customer/wishlist/:productId
 * Remove a product from wishlist
 * R-6-5: Idempotent operation
 */
router.delete(
  '/:productId',
  authenticateCookie,
  param('productId').isUUID().withMessage('productId must be a valid UUID'),
  async (req: AuthRequest, res: Response) => {
    await wishlistController.removeFromWishlist(req, res);
  }
);

/**
 * GET /api/v1/customer/wishlist
 * Get all wishlist items
 * R-6-5: Returns detailed product information
 */
router.get(
  '/',
  authenticateCookie,
  async (req: AuthRequest, res: Response) => {
    await wishlistController.getWishlistItems(req, res);
  }
);

/**
 * GET /api/v1/customer/wishlist/count
 * Get wishlist item count
 * R-6-5: Lightweight endpoint for badge displays
 */
router.get(
  '/count',
  authenticateCookie,
  async (req: AuthRequest, res: Response) => {
    await wishlistController.getWishlistCount(req, res);
  }
);

/**
 * GET /api/v1/customer/wishlist/check/:productId
 * Check if product is in wishlist
 * R-6-5: Helper for product detail pages
 */
router.get(
  '/check/:productId',
  authenticateCookie,
  param('productId').isUUID().withMessage('productId must be a valid UUID'),
  async (req: AuthRequest, res: Response) => {
    await wishlistController.checkWishlistStatus(req, res);
  }
);

export default router;
