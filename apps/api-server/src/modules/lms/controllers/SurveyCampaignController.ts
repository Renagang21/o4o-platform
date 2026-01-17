import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { SurveyCampaignService } from '../services/SurveyCampaignService.js';
import logger from '../../../utils/logger.js';

/**
 * SurveyCampaignController
 * LMS Module - SurveyCampaign Management (Phase 2 Refoundation)
 *
 * REST API for SurveyCampaign Marketing wrapper
 * Base path: /api/v1/lms/marketing/survey-campaigns
 */
export class SurveyCampaignController extends BaseController {
  // ============================================
  // CRUD
  // ============================================

  static async createCampaign(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const service = SurveyCampaignService.getInstance();

      const entity = await service.createCampaign(data);

      return BaseController.created(res, { campaign: entity });
    } catch (error: any) {
      logger.error('[SurveyCampaignController.createCampaign] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getCampaign(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = SurveyCampaignService.getInstance();

      const entity = await service.getCampaign(id);

      if (!entity) {
        return BaseController.notFound(res, 'SurveyCampaign not found');
      }

      return BaseController.ok(res, { campaign: entity });
    } catch (error: any) {
      logger.error('[SurveyCampaignController.getCampaign] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listCampaigns(req: Request, res: Response): Promise<any> {
    try {
      const filters = {
        supplierId: req.query.supplierId as string,
        surveyId: req.query.surveyId as string,
        status: req.query.status as any,
        isPublished: req.query.isPublished === 'true' ? true : req.query.isPublished === 'false' ? false : undefined,
        search: req.query.search as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      };
      const service = SurveyCampaignService.getInstance();

      const { items, total } = await service.listCampaigns(filters);

      return BaseController.okPaginated(res, items, {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      });
    } catch (error: any) {
      // Graceful fallback: return empty data if table doesn't exist
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        logger.warn('[SurveyCampaignController.listCampaigns] Table not found - returning empty');
        return BaseController.okPaginated(res, [], {
          total: 0,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          totalPages: 0,
        });
      }
      logger.error('[SurveyCampaignController.listCampaigns] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateCampaign(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const service = SurveyCampaignService.getInstance();

      const entity = await service.updateCampaign(id, data);

      if (!entity) {
        return BaseController.notFound(res, 'SurveyCampaign not found');
      }

      return BaseController.ok(res, { campaign: entity });
    } catch (error: any) {
      logger.error('[SurveyCampaignController.updateCampaign] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async deleteCampaign(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = SurveyCampaignService.getInstance();

      const deleted = await service.deleteCampaign(id);

      if (!deleted) {
        return BaseController.notFound(res, 'SurveyCampaign not found');
      }

      return BaseController.noContent(res);
    } catch (error: any) {
      logger.error('[SurveyCampaignController.deleteCampaign] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Campaign Status
  // ============================================

  static async activateCampaign(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = SurveyCampaignService.getInstance();

      const entity = await service.activateCampaign(id);

      if (!entity) {
        return BaseController.notFound(res, 'SurveyCampaign not found');
      }

      return BaseController.ok(res, { campaign: entity });
    } catch (error: any) {
      logger.error('[SurveyCampaignController.activateCampaign] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async pauseCampaign(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = SurveyCampaignService.getInstance();

      const entity = await service.pauseCampaign(id);

      if (!entity) {
        return BaseController.notFound(res, 'SurveyCampaign not found');
      }

      return BaseController.ok(res, { campaign: entity });
    } catch (error: any) {
      logger.error('[SurveyCampaignController.pauseCampaign] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async completeCampaign(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = SurveyCampaignService.getInstance();

      const entity = await service.completeCampaign(id);

      if (!entity) {
        return BaseController.notFound(res, 'SurveyCampaign not found');
      }

      return BaseController.ok(res, { campaign: entity });
    } catch (error: any) {
      logger.error('[SurveyCampaignController.completeCampaign] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async archiveCampaign(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = SurveyCampaignService.getInstance();

      const entity = await service.archiveCampaign(id);

      if (!entity) {
        return BaseController.notFound(res, 'SurveyCampaign not found');
      }

      return BaseController.ok(res, { campaign: entity });
    } catch (error: any) {
      logger.error('[SurveyCampaignController.archiveCampaign] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Queries
  // ============================================

  static async findActiveCampaigns(req: Request, res: Response): Promise<any> {
    try {
      const service = SurveyCampaignService.getInstance();

      const items = await service.findActiveCampaigns();

      return BaseController.ok(res, { campaigns: items });
    } catch (error: any) {
      logger.error('[SurveyCampaignController.findActiveCampaigns] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Statistics Recording
  // ============================================

  static async recordResponse(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = SurveyCampaignService.getInstance();

      await service.recordResponse(id);

      return BaseController.ok(res, { success: true });
    } catch (error: any) {
      logger.error('[SurveyCampaignController.recordResponse] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async recordCompleted(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = SurveyCampaignService.getInstance();

      await service.recordCompleted(id);

      return BaseController.ok(res, { success: true });
    } catch (error: any) {
      logger.error('[SurveyCampaignController.recordCompleted] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
