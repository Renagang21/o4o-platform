import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { ProgressService } from '../services/ProgressService.js';
import { AppDataSource } from '../../../database/connection.js';
import { Enrollment } from '@o4o/lms-core';
import logger from '../../../utils/logger.js';

/**
 * ProgressController
 * LMS Module - Progress Tracking
 * Handles lesson progress recording and tracking
 */
export class ProgressController extends BaseController {
  static async recordProgress(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const userId = (req as any).user?.id;

      // WO-LMS-PAID-COURSE-V1: enrollmentId 소유권 검증
      if (data.enrollmentId && userId) {
        const enrollment = await AppDataSource.getRepository(Enrollment).findOne({
          where: { id: data.enrollmentId },
          select: ['id', 'userId'],
        });
        if (enrollment && enrollment.userId !== userId) {
          return BaseController.forbidden(res, '본인의 수강 정보만 진도를 기록할 수 있습니다');
        }
      }

      const service = ProgressService.getInstance();

      const progress = await service.recordProgress(data);

      return BaseController.ok(res, { progress });
    } catch (error: any) {
      logger.error('[ProgressController.recordProgress] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getProgress(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = ProgressService.getInstance();

      const progress = await service.getProgress(id);

      if (!progress) {
        return BaseController.notFound(res, 'Progress not found');
      }

      return BaseController.ok(res, { progress });
    } catch (error: any) {
      logger.error('[ProgressController.getProgress] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listProgress(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = ProgressService.getInstance();

      const { progress, total } = await service.listProgress(filters as any);

      return BaseController.okPaginated(res, progress, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 100,
        totalPages: Math.ceil(total / (Number(filters.limit) || 100))
      });
    } catch (error: any) {
      logger.error('[ProgressController.listProgress] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getProgressByEnrollment(req: Request, res: Response): Promise<any> {
    try {
      const { enrollmentId } = req.params;
      const filters: any = { ...req.query, enrollmentId };
      const service = ProgressService.getInstance();

      const { progress, total } = await service.listProgress(filters);

      return BaseController.okPaginated(res, progress, {
        total,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 100,
        totalPages: Math.ceil(total / (Number(req.query.limit) || 100))
      });
    } catch (error: any) {
      logger.error('[ProgressController.getProgressByEnrollment] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateProgress(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const service = ProgressService.getInstance();

      const progress = await service.updateProgress(id, data);

      return BaseController.ok(res, { progress });
    } catch (error: any) {
      logger.error('[ProgressController.updateProgress] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async completeProgress(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { score } = req.body;
      const service = ProgressService.getInstance();

      const progress = await service.completeProgress(id, score);

      return BaseController.ok(res, { progress, message: 'Progress completed successfully' });
    } catch (error: any) {
      logger.error('[ProgressController.completeProgress] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async submitQuiz(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { quizAnswers, score } = req.body;
      const service = ProgressService.getInstance();

      const progress = await service.submitQuiz(id, quizAnswers, score);

      return BaseController.ok(res, { progress, message: 'Quiz submitted successfully' });
    } catch (error: any) {
      logger.error('[ProgressController.submitQuiz] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }
}
