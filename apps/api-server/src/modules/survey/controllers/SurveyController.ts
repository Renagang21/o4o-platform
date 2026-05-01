/**
 * SurveyController — Survey CRUD
 * WO-O4O-SURVEY-CORE-PHASE1-V1
 */

import type { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { SurveyService } from '../services/SurveyService.js';
import logger from '../../../utils/logger.js';

export class SurveyController extends BaseController {
  static async create(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return BaseController.error(res, new Error('login required'));
      const survey = await SurveyService.getInstance().createSurvey(userId, req.body);
      return BaseController.created(res, { survey });
    } catch (e: any) {
      logger.error('[SurveyController.create]', { error: e.message });
      return BaseController.error(res, e);
    }
  }

  static async list(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      const roles = (req as any).user?.roles ?? [];
      const result = await SurveyService.getInstance().listSurveys(req.query as any, userId, roles);
      const limit = Number((req.query as any).limit) || 20;
      return BaseController.okPaginated(res, result.items, {
        total: result.total,
        page: Number((req.query as any).page) || 1,
        limit,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (e: any) {
      // graceful: 마이그레이션 미적용 환경에서 빈 결과 반환
      if (e.message?.includes('does not exist')) {
        logger.warn('[SurveyController.list] schema not ready - returning empty', { detail: e.message });
        return BaseController.okPaginated(res, [], { total: 0, page: 1, limit: 20, totalPages: 0 });
      }
      logger.error('[SurveyController.list]', { error: e.message });
      return BaseController.error(res, e);
    }
  }

  static async get(req: Request, res: Response): Promise<any> {
    try {
      const result = await SurveyService.getInstance().getSurveyWithQuestions(req.params.id);
      if (!result) return BaseController.notFound(res, 'Survey not found');
      return BaseController.ok(res, result);
    } catch (e: any) {
      logger.error('[SurveyController.get]', { error: e.message });
      return BaseController.error(res, e);
    }
  }

  static async update(req: Request, res: Response): Promise<any> {
    try {
      const survey = await SurveyService.getInstance().updateSurvey(req.params.id, req.body);
      return BaseController.ok(res, { survey });
    } catch (e: any) {
      logger.error('[SurveyController.update]', { error: e.message });
      return BaseController.error(res, e);
    }
  }

  static async remove(req: Request, res: Response): Promise<any> {
    try {
      await SurveyService.getInstance().deleteSurvey(req.params.id);
      return BaseController.ok(res, { success: true });
    } catch (e: any) {
      logger.error('[SurveyController.remove]', { error: e.message });
      return BaseController.error(res, e);
    }
  }
}
