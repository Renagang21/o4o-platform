import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { QuizCampaignService } from '../services/QuizCampaignService.js';
import logger from '../../../utils/logger.js';

/**
 * QuizCampaignController
 * LMS Module - QuizCampaign Management (Phase 2 Refoundation)
 *
 * REST API for QuizCampaign Marketing wrapper
 * Base path: /api/v1/lms/marketing/quiz-campaigns
 */
export class QuizCampaignController extends BaseController {
  // ============================================
  // CRUD
  // ============================================

  static async createCampaign(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const service = QuizCampaignService.getInstance();

      const entity = await service.createCampaign(data);

      return BaseController.created(res, { campaign: entity });
    } catch (error: any) {
      logger.error('[QuizCampaignController.createCampaign] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getCampaign(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = QuizCampaignService.getInstance();

      const entity = await service.getCampaign(id);

      if (!entity) {
        return BaseController.notFound(res, 'QuizCampaign not found');
      }

      return BaseController.ok(res, { campaign: entity });
    } catch (error: any) {
      logger.error('[QuizCampaignController.getCampaign] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listCampaigns(req: Request, res: Response): Promise<any> {
    try {
      const filters = {
        supplierId: req.query.supplierId as string,
        quizId: req.query.quizId as string,
        status: req.query.status as any,
        isPublished: req.query.isPublished === 'true' ? true : req.query.isPublished === 'false' ? false : undefined,
        search: req.query.search as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      };
      const service = QuizCampaignService.getInstance();

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
        logger.warn('[QuizCampaignController.listCampaigns] Table not found - returning empty');
        return BaseController.okPaginated(res, [], {
          total: 0,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          totalPages: 0,
        });
      }
      logger.error('[QuizCampaignController.listCampaigns] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateCampaign(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const service = QuizCampaignService.getInstance();

      const entity = await service.updateCampaign(id, data);

      if (!entity) {
        return BaseController.notFound(res, 'QuizCampaign not found');
      }

      return BaseController.ok(res, { campaign: entity });
    } catch (error: any) {
      logger.error('[QuizCampaignController.updateCampaign] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async deleteCampaign(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = QuizCampaignService.getInstance();

      const deleted = await service.deleteCampaign(id);

      if (!deleted) {
        return BaseController.notFound(res, 'QuizCampaign not found');
      }

      return BaseController.noContent(res);
    } catch (error: any) {
      logger.error('[QuizCampaignController.deleteCampaign] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Campaign Status
  // ============================================

  static async activateCampaign(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = QuizCampaignService.getInstance();

      const entity = await service.activateCampaign(id);

      if (!entity) {
        return BaseController.notFound(res, 'QuizCampaign not found');
      }

      return BaseController.ok(res, { campaign: entity });
    } catch (error: any) {
      logger.error('[QuizCampaignController.activateCampaign] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async pauseCampaign(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = QuizCampaignService.getInstance();

      const entity = await service.pauseCampaign(id);

      if (!entity) {
        return BaseController.notFound(res, 'QuizCampaign not found');
      }

      return BaseController.ok(res, { campaign: entity });
    } catch (error: any) {
      logger.error('[QuizCampaignController.pauseCampaign] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async completeCampaign(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = QuizCampaignService.getInstance();

      const entity = await service.completeCampaign(id);

      if (!entity) {
        return BaseController.notFound(res, 'QuizCampaign not found');
      }

      return BaseController.ok(res, { campaign: entity });
    } catch (error: any) {
      logger.error('[QuizCampaignController.completeCampaign] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async archiveCampaign(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = QuizCampaignService.getInstance();

      const entity = await service.archiveCampaign(id);

      if (!entity) {
        return BaseController.notFound(res, 'QuizCampaign not found');
      }

      return BaseController.ok(res, { campaign: entity });
    } catch (error: any) {
      logger.error('[QuizCampaignController.archiveCampaign] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Queries
  // ============================================

  static async findActiveCampaigns(req: Request, res: Response): Promise<any> {
    try {
      const service = QuizCampaignService.getInstance();

      const items = await service.findActiveCampaigns();

      return BaseController.ok(res, { campaigns: items });
    } catch (error: any) {
      logger.error('[QuizCampaignController.findActiveCampaigns] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Statistics Recording
  // ============================================

  static async recordParticipation(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = QuizCampaignService.getInstance();

      await service.recordParticipation(id);

      return BaseController.ok(res, { success: true });
    } catch (error: any) {
      logger.error('[QuizCampaignController.recordParticipation] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async recordCompletion(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { score } = req.body;
      const service = QuizCampaignService.getInstance();

      await service.recordCompletion(id, score || 0);

      return BaseController.ok(res, { success: true });
    } catch (error: any) {
      logger.error('[QuizCampaignController.recordCompletion] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
