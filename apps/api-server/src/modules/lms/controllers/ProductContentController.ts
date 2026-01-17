import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { ProductContentService } from '../services/ProductContentService.js';
import logger from '../../../utils/logger.js';

/**
 * ProductContentController
 * LMS Module - ProductContent Management (Phase 2 Refoundation)
 *
 * REST API for ProductContent Marketing wrapper
 * Base path: /api/v1/lms/marketing/products
 */
export class ProductContentController extends BaseController {
  // ============================================
  // CRUD
  // ============================================

  static async createProductContent(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const service = ProductContentService.getInstance();

      const entity = await service.createProductContent(data);

      return BaseController.created(res, { productContent: entity });
    } catch (error: any) {
      logger.error('[ProductContentController.createProductContent] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getProductContent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = ProductContentService.getInstance();

      const entity = await service.getProductContent(id);

      if (!entity) {
        return BaseController.notFound(res, 'ProductContent not found');
      }

      return BaseController.ok(res, { productContent: entity });
    } catch (error: any) {
      logger.error('[ProductContentController.getProductContent] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listProductContents(req: Request, res: Response): Promise<any> {
    try {
      const filters = {
        supplierId: req.query.supplierId as string,
        bundleId: req.query.bundleId as string,
        status: req.query.status as any,
        isPublished: req.query.isPublished === 'true' ? true : req.query.isPublished === 'false' ? false : undefined,
        search: req.query.search as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      };
      const service = ProductContentService.getInstance();

      const { items, total } = await service.listProductContents(filters);

      return BaseController.okPaginated(res, items, {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      });
    } catch (error: any) {
      // Graceful fallback: return empty data if table doesn't exist
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        logger.warn('[ProductContentController.listProductContents] Table not found - returning empty');
        return BaseController.okPaginated(res, [], {
          total: 0,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          totalPages: 0,
        });
      }
      logger.error('[ProductContentController.listProductContents] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateProductContent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const service = ProductContentService.getInstance();

      const entity = await service.updateProductContent(id, data);

      if (!entity) {
        return BaseController.notFound(res, 'ProductContent not found');
      }

      return BaseController.ok(res, { productContent: entity });
    } catch (error: any) {
      logger.error('[ProductContentController.updateProductContent] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async deleteProductContent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = ProductContentService.getInstance();

      const deleted = await service.deleteProductContent(id);

      if (!deleted) {
        return BaseController.notFound(res, 'ProductContent not found');
      }

      return BaseController.noContent(res);
    } catch (error: any) {
      logger.error('[ProductContentController.deleteProductContent] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Publishing
  // ============================================

  static async publishProductContent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = ProductContentService.getInstance();

      const entity = await service.publishProductContent(id);

      if (!entity) {
        return BaseController.notFound(res, 'ProductContent not found');
      }

      return BaseController.ok(res, { productContent: entity });
    } catch (error: any) {
      logger.error('[ProductContentController.publishProductContent] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async pauseProductContent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = ProductContentService.getInstance();

      const entity = await service.pauseProductContent(id);

      if (!entity) {
        return BaseController.notFound(res, 'ProductContent not found');
      }

      return BaseController.ok(res, { productContent: entity });
    } catch (error: any) {
      logger.error('[ProductContentController.pauseProductContent] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async archiveProductContent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = ProductContentService.getInstance();

      const entity = await service.archiveProductContent(id);

      if (!entity) {
        return BaseController.notFound(res, 'ProductContent not found');
      }

      return BaseController.ok(res, { productContent: entity });
    } catch (error: any) {
      logger.error('[ProductContentController.archiveProductContent] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Queries
  // ============================================

  static async findPublished(req: Request, res: Response): Promise<any> {
    try {
      const service = ProductContentService.getInstance();

      const items = await service.findPublished();

      return BaseController.ok(res, { productContents: items });
    } catch (error: any) {
      logger.error('[ProductContentController.findPublished] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async findBySupplier(req: Request, res: Response): Promise<any> {
    try {
      const { supplierId } = req.params;
      const service = ProductContentService.getInstance();

      const items = await service.findBySupplier(supplierId);

      return BaseController.ok(res, { productContents: items });
    } catch (error: any) {
      logger.error('[ProductContentController.findBySupplier] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
