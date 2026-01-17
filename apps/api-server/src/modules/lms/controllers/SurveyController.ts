import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { SurveyService } from '../services/SurveyService.js';
import logger from '../../../utils/logger.js';

/**
 * SurveyController
 * LMS Module - Survey Management (Phase 1 Refoundation)
 *
 * REST API for Survey Core Engine
 * Base path: /api/v1/lms/surveys
 */
export class SurveyController extends BaseController {
  // ============================================
  // Survey CRUD
  // ============================================

  static async createSurvey(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const service = SurveyService.getInstance();

      const survey = await service.createSurvey(data);

      return BaseController.created(res, { survey });
    } catch (error: any) {
      logger.error('[SurveyController.createSurvey] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getSurvey(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = SurveyService.getInstance();

      const survey = await service.getSurvey(id);

      if (!survey) {
        return BaseController.notFound(res, 'Survey not found');
      }

      return BaseController.ok(res, { survey });
    } catch (error: any) {
      logger.error('[SurveyController.getSurvey] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listSurveys(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = SurveyService.getInstance();

      const { surveys, total } = await service.listSurveys(filters as any);

      return BaseController.okPaginated(res, surveys, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        totalPages: Math.ceil(total / (Number(filters.limit) || 20))
      });
    } catch (error: any) {
      // Graceful fallback: return empty data if table doesn't exist
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        logger.warn('[SurveyController.listSurveys] Survey tables not found - returning empty');
        return BaseController.okPaginated(res, [], {
          total: 0,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          totalPages: 0
        });
      }
      logger.error('[SurveyController.listSurveys] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateSurvey(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const service = SurveyService.getInstance();

      const survey = await service.updateSurvey(id, data);

      if (!survey) {
        return BaseController.notFound(res, 'Survey not found');
      }

      return BaseController.ok(res, { survey });
    } catch (error: any) {
      logger.error('[SurveyController.updateSurvey] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async deleteSurvey(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = SurveyService.getInstance();

      const deleted = await service.deleteSurvey(id);

      if (!deleted) {
        return BaseController.notFound(res, 'Survey not found');
      }

      return BaseController.noContent(res);
    } catch (error: any) {
      logger.error('[SurveyController.deleteSurvey] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Publishing
  // ============================================

  static async publishSurvey(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = SurveyService.getInstance();

      const survey = await service.publishSurvey(id);

      if (!survey) {
        return BaseController.notFound(res, 'Survey not found');
      }

      return BaseController.ok(res, { survey });
    } catch (error: any) {
      logger.error('[SurveyController.publishSurvey] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async closeSurvey(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = SurveyService.getInstance();

      const survey = await service.closeSurvey(id);

      if (!survey) {
        return BaseController.notFound(res, 'Survey not found');
      }

      return BaseController.ok(res, { survey });
    } catch (error: any) {
      logger.error('[SurveyController.closeSurvey] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async archiveSurvey(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = SurveyService.getInstance();

      const survey = await service.archiveSurvey(id);

      if (!survey) {
        return BaseController.notFound(res, 'Survey not found');
      }

      return BaseController.ok(res, { survey });
    } catch (error: any) {
      logger.error('[SurveyController.archiveSurvey] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Questions
  // ============================================

  static async getQuestions(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = SurveyService.getInstance();

      const survey = await service.getSurvey(id);
      if (!survey) {
        return BaseController.notFound(res, 'Survey not found');
      }

      const questions = await service.getQuestions(id);

      return BaseController.ok(res, { questions });
    } catch (error: any) {
      logger.error('[SurveyController.getQuestions] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async addQuestion(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const questionData = req.body;
      const service = SurveyService.getInstance();

      const question = await service.addQuestion(id, questionData);

      if (!question) {
        return BaseController.notFound(res, 'Survey not found');
      }

      return BaseController.created(res, { question });
    } catch (error: any) {
      logger.error('[SurveyController.addQuestion] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateQuestion(req: Request, res: Response): Promise<any> {
    try {
      const { questionId } = req.params;
      const questionData = req.body;
      const service = SurveyService.getInstance();

      const question = await service.updateQuestion(questionId, questionData);

      if (!question) {
        return BaseController.notFound(res, 'Question not found');
      }

      return BaseController.ok(res, { question });
    } catch (error: any) {
      logger.error('[SurveyController.updateQuestion] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async deleteQuestion(req: Request, res: Response): Promise<any> {
    try {
      const { questionId } = req.params;
      const service = SurveyService.getInstance();

      const deleted = await service.deleteQuestion(questionId);

      if (!deleted) {
        return BaseController.notFound(res, 'Question not found');
      }

      return BaseController.noContent(res);
    } catch (error: any) {
      logger.error('[SurveyController.deleteQuestion] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async reorderQuestions(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { questionIds } = req.body;
      const service = SurveyService.getInstance();

      const survey = await service.getSurvey(id);
      if (!survey) {
        return BaseController.notFound(res, 'Survey not found');
      }

      await service.reorderQuestions(id, questionIds);

      return BaseController.ok(res, { success: true });
    } catch (error: any) {
      logger.error('[SurveyController.reorderQuestions] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Responses
  // ============================================

  static async startResponse(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || req.body.userId;
      const { isAnonymous } = req.body;
      const service = SurveyService.getInstance();

      const response = await service.startResponse(id, userId, {
        isAnonymous,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      if (!response) {
        return BaseController.notFound(res, 'Survey not found or not accepting responses');
      }

      return BaseController.created(res, { response });
    } catch (error: any) {
      logger.error('[SurveyController.startResponse] Error', { error: error.message });
      return BaseController.error(res, error.message);
    }
  }

  static async getResponse(req: Request, res: Response): Promise<any> {
    try {
      const { responseId } = req.params;
      const service = SurveyService.getInstance();

      const response = await service.getResponse(responseId);

      if (!response) {
        return BaseController.notFound(res, 'Response not found');
      }

      return BaseController.ok(res, { response });
    } catch (error: any) {
      logger.error('[SurveyController.getResponse] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getSurveyResponses(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const filters = req.query;
      const service = SurveyService.getInstance();

      const survey = await service.getSurvey(id);
      if (!survey) {
        return BaseController.notFound(res, 'Survey not found');
      }

      const { responses, total } = await service.getSurveyResponses(id, filters as any);

      return BaseController.okPaginated(res, responses, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        totalPages: Math.ceil(total / (Number(filters.limit) || 20))
      });
    } catch (error: any) {
      logger.error('[SurveyController.getSurveyResponses] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async submitAnswer(req: Request, res: Response): Promise<any> {
    try {
      const { responseId } = req.params;
      const { questionId, value } = req.body;
      const service = SurveyService.getInstance();

      const response = await service.submitAnswer(responseId, questionId, value);

      if (!response) {
        return BaseController.notFound(res, 'Response not found or already completed');
      }

      return BaseController.ok(res, { response });
    } catch (error: any) {
      logger.error('[SurveyController.submitAnswer] Error', { error: error.message });
      return BaseController.error(res, error.message);
    }
  }

  static async completeResponse(req: Request, res: Response): Promise<any> {
    try {
      const { responseId } = req.params;
      const service = SurveyService.getInstance();

      const response = await service.completeResponse(responseId);

      if (!response) {
        return BaseController.notFound(res, 'Response not found or already completed');
      }

      return BaseController.ok(res, { response });
    } catch (error: any) {
      logger.error('[SurveyController.completeResponse] Error', { error: error.message });
      return BaseController.error(res, error.message);
    }
  }

  // ============================================
  // Bundle Queries (Frontend Compatibility)
  // ============================================

  static async getSurveysByBundle(req: Request, res: Response): Promise<any> {
    try {
      const { bundleId } = req.params;
      const service = SurveyService.getInstance();

      const { surveys, total } = await service.listSurveys({
        bundleId,
        isPublished: true,
        limit: 100,
      });

      return BaseController.ok(res, { surveys, total });
    } catch (error: any) {
      // Graceful fallback: return empty data if table doesn't exist
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        logger.warn('[SurveyController.getSurveysByBundle] Survey tables not found - returning empty');
        return BaseController.ok(res, { surveys: [], total: 0 });
      }
      logger.error('[SurveyController.getSurveysByBundle] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async checkUserResponse(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const service = SurveyService.getInstance();

      if (!userId) {
        return BaseController.ok(res, { hasResponded: false });
      }

      const { responses } = await service.getSurveyResponses(id, {
        status: 'completed' as any,
        limit: 1,
      });

      // Check if any response belongs to the current user
      const hasResponded = responses.some(r => r.userId === userId);

      return BaseController.ok(res, { hasResponded });
    } catch (error: any) {
      logger.error('[SurveyController.checkUserResponse] Error', { error: error.message });
      return BaseController.ok(res, { hasResponded: false });
    }
  }

  // ============================================
  // Stats
  // ============================================

  static async getSurveyStats(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = SurveyService.getInstance();

      const survey = await service.getSurvey(id);
      if (!survey) {
        return BaseController.notFound(res, 'Survey not found');
      }

      const stats = await service.getSurveyStats(id);

      return BaseController.ok(res, { survey, stats });
    } catch (error: any) {
      logger.error('[SurveyController.getSurveyStats] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getQuestionStats(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = SurveyService.getInstance();

      const survey = await service.getSurvey(id);
      if (!survey) {
        return BaseController.notFound(res, 'Survey not found');
      }

      const stats = await service.getQuestionStats(id);

      return BaseController.ok(res, { stats });
    } catch (error: any) {
      logger.error('[SurveyController.getQuestionStats] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
