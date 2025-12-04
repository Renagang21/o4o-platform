import { Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { SellerProductService } from '../services/SellerProductService.js';
import { SellerService } from '../services/SellerService.js';
import logger from '../../../utils/logger.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';

/**
 * SellerProductController
 * NextGen V2 - Dropshipping Module
 * Phase B-4 Step 4: Integrated with SellerProductService and SellerAuthorizationService
 * Handles seller product catalog operations with authorization checks
 */
export class SellerProductController extends BaseController {
  static async listSellerProducts(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      // Get seller ID for authenticated user
      const sellerService = SellerService.getInstance();
      const seller = await sellerService.getByUserId(req.user.id);

      if (!seller) {
        return BaseController.notFound(res, 'Seller profile not found');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

      const sellerProductService = SellerProductService.getInstance();

      const result = await sellerProductService.getSellerProducts({
        sellerId: seller.id,
        page,
        limit,
        search,
        status: status as any,
        isActive
      });

      return BaseController.ok(res, {
        sellerProducts: result.sellerProducts,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      });
    } catch (error: any) {
      logger.error('[SellerProductController.listSellerProducts] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async getSellerProduct(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const { id } = req.params;

      const sellerService = SellerService.getInstance();
      const seller = await sellerService.getByUserId(req.user.id);

      if (!seller) {
        return BaseController.notFound(res, 'Seller profile not found');
      }

      const sellerProductService = SellerProductService.getInstance();
      const sellerProduct = await sellerProductService.getSellerProducts({
        sellerId: seller.id,
        limit: 1
      });

      if (!sellerProduct || sellerProduct.sellerProducts.length === 0) {
        return BaseController.notFound(res, 'Seller product not found');
      }

      return BaseController.ok(res, {
        sellerProduct: sellerProduct.sellerProducts[0]
      });
    } catch (error: any) {
      logger.error('[SellerProductController.getSellerProduct] Error', {
        error: error.message,
        sellerProductId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async addProductToSeller(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const sellerService = SellerService.getInstance();
      const seller = await sellerService.getByUserId(req.user.id);

      if (!seller) {
        return BaseController.notFound(res, 'Seller profile not found');
      }

      const data = {
        ...req.body,
        sellerId: seller.id
      };

      const sellerProductService = SellerProductService.getInstance();
      const sellerProduct = await sellerProductService.addProductToSeller(data);

      return BaseController.ok(res, {
        message: 'Product added to seller catalog successfully',
        sellerProduct
      });
    } catch (error: any) {
      logger.error('[SellerProductController.addProductToSeller] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async removeProductFromSeller(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const { id } = req.params;

      const sellerProductService = SellerProductService.getInstance();
      const success = await sellerProductService.removeProductFromSeller(id);

      return BaseController.ok(res, {
        message: 'Product removed from seller catalog successfully',
        success
      });
    } catch (error: any) {
      logger.error('[SellerProductController.removeProductFromSeller] Error', {
        error: error.message,
        userId: req.user?.id,
        sellerProductId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  /**
   * Check Product Status for Seller
   * Phase B-4 Step 4: New endpoint for authorization status check
   */
  static async getProductStatus(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const { productId } = req.params;

      const sellerService = SellerService.getInstance();
      const seller = await sellerService.getByUserId(req.user.id);

      if (!seller) {
        return BaseController.notFound(res, 'Seller profile not found');
      }

      const sellerProductService = SellerProductService.getInstance();
      const status = await sellerProductService.getProductStatus(seller.id, productId);

      return BaseController.ok(res, status);
    } catch (error: any) {
      logger.error('[SellerProductController.getProductStatus] Error', {
        error: error.message,
        userId: req.user?.id,
        productId: req.params.productId,
      });
      return BaseController.error(res, error);
    }
  }

  /**
   * Get Seller Product Statistics
   * Phase B-4 Step 4: Dashboard KPI endpoint
   */
  static async getStats(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const sellerService = SellerService.getInstance();
      const seller = await sellerService.getByUserId(req.user.id);

      if (!seller) {
        return BaseController.notFound(res, 'Seller profile not found');
      }

      const sellerProductService = SellerProductService.getInstance();
      const stats = await sellerProductService.getSellerProductStats(seller.id);

      return BaseController.ok(res, { stats });
    } catch (error: any) {
      logger.error('[SellerProductController.getStats] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  /**
   * Create Seller Product (alias for addProductToSeller)
   * Phase B-4 Step 10: Route compatibility method
   */
  static async createSellerProduct(req: AuthRequest, res: Response): Promise<any> {
    return SellerProductController.addProductToSeller(req, res);
  }

  /**
   * Update Seller Product
   * Phase B-4 Step 10: Missing CRUD method
   */
  static async updateSellerProduct(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const { id } = req.params;
      const updateData = req.body;

      const sellerService = SellerService.getInstance();
      const seller = await sellerService.getByUserId(req.user.id);

      if (!seller) {
        return BaseController.notFound(res, 'Seller profile not found');
      }

      const sellerProductService = SellerProductService.getInstance();
      const sellerProduct = await sellerProductService.updateSellerProduct(id, updateData);

      return BaseController.ok(res, {
        message: 'Seller product updated successfully',
        sellerProduct
      });
    } catch (error: any) {
      logger.error('[SellerProductController.updateSellerProduct] Error', {
        error: error.message,
        userId: req.user?.id,
        sellerProductId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  /**
   * Delete Seller Product (alias for removeProductFromSeller)
   * Phase B-4 Step 10: Route compatibility method
   */
  static async deleteSellerProduct(req: AuthRequest, res: Response): Promise<any> {
    return SellerProductController.removeProductFromSeller(req, res);
  }
}
