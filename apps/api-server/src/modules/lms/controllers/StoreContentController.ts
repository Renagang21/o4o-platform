import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { StoreContentService } from '../services/StoreContentService.js';
import logger from '../../../utils/logger.js';

/**
 * StoreContentController
 * LMS Module - Store Content Copy (WO-O4O-STORE-CONTENT-COPY)
 *
 * Template → Store Copy → StoreContent → 매장 수정
 */
export class StoreContentController extends BaseController {
  // ============================================
  // Template Copy
  // ============================================

  static async copyTemplate(req: Request, res: Response): Promise<any> {
    try {
      const { templateId, storeId } = req.body;

      if (!templateId || !storeId) {
        return BaseController.validationError(res, [
          { field: 'templateId', message: 'templateId is required' },
          { field: 'storeId', message: 'storeId is required' },
        ].filter(e => !req.body[e.field]));
      }

      const service = StoreContentService.getInstance();
      const storeContent = await service.copyTemplateToStore({ templateId, storeId });

      if (!storeContent) {
        return BaseController.notFound(res, 'Template not found or has no published version');
      }

      return BaseController.created(res, { storeContent });
    } catch (error: any) {
      logger.error('[StoreContentController.copyTemplate] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // StoreContent CRUD
  // ============================================

  static async listStoreContents(req: Request, res: Response): Promise<any> {
    try {
      const { storeId, status, search, page, limit } = req.query;

      if (!storeId) {
        return BaseController.validationError(res, [
          { field: 'storeId', message: 'storeId query parameter is required' },
        ]);
      }

      const service = StoreContentService.getInstance();
      const { items, total } = await service.listStoreContents({
        storeId: storeId as string,
        status: status as any,
        search: search as string,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });

      return BaseController.okPaginated(res, items, {
        total,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        totalPages: Math.ceil(total / (Number(limit) || 20)),
      });
    } catch (error: any) {
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        logger.warn('[StoreContentController.listStoreContents] Tables not found - returning empty');
        return BaseController.okPaginated(res, [], {
          total: 0,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          totalPages: 0,
        });
      }
      logger.error('[StoreContentController.listStoreContents] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getStoreContent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = StoreContentService.getInstance();
      const storeContent = await service.getStoreContent(id);

      if (!storeContent) {
        return BaseController.notFound(res, 'StoreContent not found');
      }

      return BaseController.ok(res, { storeContent });
    } catch (error: any) {
      logger.error('[StoreContentController.getStoreContent] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateStoreContent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const service = StoreContentService.getInstance();
      const storeContent = await service.updateStoreContent(id, data);

      if (!storeContent) {
        return BaseController.notFound(res, 'StoreContent not found');
      }

      return BaseController.ok(res, { storeContent });
    } catch (error: any) {
      logger.error('[StoreContentController.updateStoreContent] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async deleteStoreContent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = StoreContentService.getInstance();
      const deleted = await service.deleteStoreContent(id);

      if (!deleted) {
        return BaseController.notFound(res, 'StoreContent not found');
      }

      return BaseController.noContent(res);
    } catch (error: any) {
      logger.error('[StoreContentController.deleteStoreContent] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Block Management
  // ============================================

  static async getBlocks(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = StoreContentService.getInstance();

      // Verify store content exists
      const storeContent = await service.getStoreContent(id);
      if (!storeContent) {
        return BaseController.notFound(res, 'StoreContent not found');
      }

      const blocks = await service.getBlocks(id);
      return BaseController.ok(res, { blocks });
    } catch (error: any) {
      logger.error('[StoreContentController.getBlocks] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateBlock(req: Request, res: Response): Promise<any> {
    try {
      const { blockId } = req.params;
      const data = req.body;
      const service = StoreContentService.getInstance();
      const block = await service.updateBlock(blockId, data);

      if (!block) {
        return BaseController.notFound(res, 'StoreContentBlock not found');
      }

      return BaseController.ok(res, { block });
    } catch (error: any) {
      logger.error('[StoreContentController.updateBlock] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Content Usage (WO-O4O-STORE-CONTENT-USAGE)
  // ============================================

  static async getSNSContent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = StoreContentService.getInstance();
      const result = await service.generateSNSContent(id);

      if (!result) {
        return BaseController.notFound(res, 'StoreContent not found or has no slug');
      }

      return BaseController.ok(res, result);
    } catch (error: any) {
      logger.error('[StoreContentController.getSNSContent] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getPOPContent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = StoreContentService.getInstance();
      const result = await service.generatePOPContent(id);

      if (!result) {
        return BaseController.notFound(res, 'StoreContent not found or has no slug');
      }

      return BaseController.ok(res, result);
    } catch (error: any) {
      logger.error('[StoreContentController.getPOPContent] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getQRCode(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = StoreContentService.getInstance();
      const result = await service.generateQRCode(id);

      if (!result) {
        return BaseController.notFound(res, 'StoreContent not found or has no slug');
      }

      return BaseController.ok(res, result);
    } catch (error: any) {
      logger.error('[StoreContentController.getQRCode] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getPublicContent(req: Request, res: Response): Promise<any> {
    try {
      const { slug } = req.params;
      const service = StoreContentService.getInstance();
      const result = await service.getPublicContent(slug);

      if (!result) {
        return BaseController.notFound(res, 'Content not found or not public');
      }

      return BaseController.ok(res, result);
    } catch (error: any) {
      logger.error('[StoreContentController.getPublicContent] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
