import { Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { SupplierService } from '../services/SupplierService.js';
import { SupplierApplicationDto, UpdateSupplierDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';

/**
 * SupplierController
 * NextGen V2 - Dropshipping Module
 * Handles supplier operations
 */
export class SupplierController extends BaseController {
  static async createSupplier(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const data = req.body as SupplierApplicationDto;
      const supplierService = SupplierService.getInstance();

      const supplier = await supplierService.createSupplier(req.user.id, data);

      return BaseController.ok(res, { supplier });
    } catch (error: any) {
      logger.error('[SupplierController.createSupplier] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async getSupplier(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const supplierService = SupplierService.getInstance();

      const supplier = await supplierService.findById(id);

      if (!supplier) {
        return BaseController.notFound(res, 'Supplier not found');
      }

      return BaseController.ok(res, { supplier });
    } catch (error: any) {
      logger.error('[SupplierController.getSupplier] Error', {
        error: error.message,
        supplierId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async getMySupplierProfile(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const supplierService = SupplierService.getInstance();
      const supplier = await supplierService.getSupplierByUserId(req.user.id);

      if (!supplier) {
        return BaseController.notFound(res, 'Supplier profile not found');
      }

      return BaseController.ok(res, { supplier });
    } catch (error: any) {
      logger.error('[SupplierController.getMySupplierProfile] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async updateSupplier(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const { id } = req.params;
      const data = req.body as UpdateSupplierDto;
      const supplierService = SupplierService.getInstance();

      const supplier = await supplierService.updateSupplier(id, data);

      return BaseController.ok(res, { supplier });
    } catch (error: any) {
      logger.error('[SupplierController.updateSupplier] Error', {
        error: error.message,
        supplierId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async listSuppliers(req: AuthRequest, res: Response): Promise<any> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const supplierService = SupplierService.getInstance();

      const { suppliers, total } = await supplierService.listSuppliers({
        page,
        limit,
      });

      return BaseController.okPaginated(res, suppliers, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error: any) {
      logger.error('[SupplierController.listSuppliers] Error', {
        error: error.message,
      });
      return BaseController.error(res, error);
    }
  }
}
