import { Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { SellerService } from '../services/SellerService.js';
import { SellerApplicationDto, UpdateSellerDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';

/**
 * SellerController
 * NextGen V2 - Dropshipping Module
 * Handles seller operations
 */
export class SellerController extends BaseController {
  static async createSeller(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const data = req.body as SellerApplicationDto;
      const sellerService = SellerService.getInstance();

      const seller = await sellerService.createSeller(req.user.id, data);

      return BaseController.ok(res, {
        message: 'Seller application submitted',
        seller
      });
    } catch (error: any) {
      logger.error('[SellerController.createSeller] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async getSeller(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const { id } = req.params;
      const sellerService = SellerService.getInstance();

      const seller = await sellerService.findById(id);

      if (!seller) {
        return BaseController.notFound(res, 'Seller not found');
      }

      return BaseController.ok(res, { seller });
    } catch (error: any) {
      logger.error('[SellerController.getSeller] Error', {
        error: error.message,
        sellerId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async getMySellerProfile(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const sellerService = SellerService.getInstance();
      const seller = await sellerService.getByUserId(req.user.id);

      if (!seller) {
        return BaseController.notFound(res, 'Seller profile not found');
      }

      return BaseController.ok(res, { seller });
    } catch (error: any) {
      logger.error('[SellerController.getMySellerProfile] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async updateSeller(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const { id } = req.params;
      const data = req.body as UpdateSellerDto;
      const sellerService = SellerService.getInstance();

      const seller = await sellerService.updateSellerProfile(id, data);

      return BaseController.ok(res, {
        message: 'Seller updated',
        seller
      });
    } catch (error: any) {
      logger.error('[SellerController.updateSeller] Error', {
        error: error.message,
        sellerId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async listSellers(req: AuthRequest, res: Response): Promise<any> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // TODO: Implement SellerService.list with pagination
      return BaseController.okPaginated(res, [], {
        page,
        limit,
        total: 0,
        totalPages: 0,
      });
    } catch (error: any) {
      logger.error('[SellerController.listSellers] Error', {
        error: error.message,
      });
      return BaseController.error(res, error);
    }
  }
}
