import { Request, Response } from 'express';
import { SellerService } from '../services/SellerService.js';
import logger from '../utils/logger.js';

/**
 * SellerController
 * Phase PD-3: Dropshipping Seller Workflow
 *
 * Handles HTTP requests for seller operations
 */

const sellerService = new SellerService();

export class SellerController {
  /**
   * GET /api/v2/seller/catalog
   * Get supplier product catalog for import
   */
  static async getCatalog(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const filters = {
        search: req.query.search as string,
        category: req.query.category as string,
        supplierId: req.query.supplierId as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        onlyAvailable: req.query.onlyAvailable !== 'false'
      };

      const result = await sellerService.getCatalog(sellerId, filters);

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      logger.error('[SellerController] Error fetching catalog:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch product catalog',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/v2/seller/catalog/import
   * Import a product into seller's catalog
   */
  static async importProduct(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { productId, salePrice, marginRate, syncPolicy } = req.body;

      if (!productId) {
        res.status(400).json({
          success: false,
          error: 'productId is required'
        });
        return;
      }

      const sellerProduct = await sellerService.importProduct(sellerId, {
        productId,
        salePrice: salePrice ? parseFloat(salePrice) : undefined,
        marginRate: marginRate ? parseFloat(marginRate) : undefined,
        syncPolicy
      });

      res.status(201).json({
        success: true,
        data: {
          id: sellerProduct.id,
          productId: sellerProduct.productId,
          salePrice: parseFloat(sellerProduct.salePrice?.toString() || '0'),
          basePriceSnapshot: parseFloat(sellerProduct.basePriceSnapshot?.toString() || '0'),
          marginRate: parseFloat(sellerProduct.marginRate?.toString() || '0'),
          marginAmount: parseFloat(sellerProduct.marginAmount?.toString() || '0'),
          syncPolicy: sellerProduct.syncPolicy,
          isActive: sellerProduct.isActive,
          createdAt: sellerProduct.createdAt
        }
      });

    } catch (error) {
      logger.error('[SellerController] Error importing product:', error);

      if (error instanceof Error && error.message === 'Product already imported') {
        res.status(409).json({
          success: false,
          error: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to import product',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/v2/seller/products
   * Get seller's imported products
   */
  static async getSellerProducts(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const filters = {
        search: req.query.search as string,
        syncPolicy: req.query.syncPolicy as 'auto' | 'manual',
        isActive: req.query.isActive !== undefined
          ? req.query.isActive === 'true'
          : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: (req.query.sortBy as 'createdAt' | 'salePrice' | 'marginRate') || 'createdAt',
        sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC'
      };

      const result = await sellerService.getSellerProducts(sellerId, filters);

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      logger.error('[SellerController] Error fetching seller products:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/v2/seller/products/:id
   * Get a specific seller product
   */
  static async getSellerProduct(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.id;
      const { id } = req.params;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const sellerProduct = await sellerService.getSellerProduct(sellerId, id);

      res.json({
        success: true,
        data: sellerProduct
      });

    } catch (error) {
      logger.error('[SellerController] Error fetching seller product:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to fetch product',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * PATCH /api/v2/seller/products/:id
   * Update seller product
   */
  static async updateSellerProduct(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.id;
      const { id } = req.params;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { salePrice, marginRate, syncPolicy, isActive } = req.body;

      const updates: any = {};

      if (salePrice !== undefined) {
        updates.salePrice = parseFloat(salePrice);
      }

      if (marginRate !== undefined) {
        updates.marginRate = parseFloat(marginRate);
      }

      if (syncPolicy !== undefined) {
        updates.syncPolicy = syncPolicy;
      }

      if (isActive !== undefined) {
        updates.isActive = isActive;
      }

      const sellerProduct = await sellerService.updateSellerProduct(sellerId, id, updates);

      res.json({
        success: true,
        data: {
          id: sellerProduct.id,
          productId: sellerProduct.productId,
          salePrice: parseFloat(sellerProduct.salePrice?.toString() || '0'),
          basePriceSnapshot: parseFloat(sellerProduct.basePriceSnapshot?.toString() || '0'),
          marginRate: parseFloat(sellerProduct.marginRate?.toString() || '0'),
          marginAmount: parseFloat(sellerProduct.marginAmount?.toString() || '0'),
          syncPolicy: sellerProduct.syncPolicy,
          isActive: sellerProduct.isActive,
          updatedAt: sellerProduct.updatedAt
        }
      });

    } catch (error) {
      logger.error('[SellerController] Error updating seller product:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update product',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * DELETE /api/v2/seller/products/:id
   * Delete seller product
   */
  static async deleteSellerProduct(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.id;
      const { id } = req.params;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      await sellerService.deleteSellerProduct(sellerId, id);

      res.json({
        success: true,
        message: 'Product removed from your catalog'
      });

    } catch (error) {
      logger.error('[SellerController] Error deleting seller product:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete product',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/v2/seller/stats
   * Get seller import statistics
   */
  static async getSellerStats(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const stats = await sellerService.getSellerStats(sellerId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('[SellerController] Error fetching seller stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
