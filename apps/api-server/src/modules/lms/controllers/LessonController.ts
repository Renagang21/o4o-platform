import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { LessonService } from '../services/LessonService.js';
import logger from '../../../utils/logger.js';

/**
 * LessonController
 * LMS Module - Lesson Management
 * Handles Lesson CRUD and reordering operations
 */
export class LessonController extends BaseController {
  static async createLesson(req: Request, res: Response): Promise<any> {
    try {
      const { courseId } = req.params;
      const data = { ...req.body, courseId };
      const service = LessonService.getInstance();

      const lesson = await service.createLesson(data);

      return BaseController.created(res, { lesson });
    } catch (error: any) {
      logger.error('[LessonController.createLesson] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getLesson(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = LessonService.getInstance();

      const lesson = await service.getLesson(id);

      if (!lesson) {
        return BaseController.notFound(res, 'Lesson not found');
      }

      return BaseController.ok(res, { lesson });
    } catch (error: any) {
      logger.error('[LessonController.getLesson] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listLessonsByCourse(req: Request, res: Response): Promise<any> {
    try {
      const { courseId } = req.params;
      const filters = req.query;
      const service = LessonService.getInstance();

      const { lessons, total } = await service.listLessonsByCourse(courseId, filters as any);

      return BaseController.okPaginated(res, lessons, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 100,
        totalPages: Math.ceil(total / (Number(filters.limit) || 100))
      });
    } catch (error: any) {
      logger.error('[LessonController.listLessonsByCourse] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateLesson(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const service = LessonService.getInstance();

      const lesson = await service.updateLesson(id, data);

      return BaseController.ok(res, { lesson });
    } catch (error: any) {
      logger.error('[LessonController.updateLesson] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async deleteLesson(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = LessonService.getInstance();

      await service.deleteLesson(id);

      return BaseController.ok(res, { message: 'Lesson deleted successfully' });
    } catch (error: any) {
      logger.error('[LessonController.deleteLesson] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async reorderLessons(req: Request, res: Response): Promise<any> {
    try {
      const { courseId } = req.params;
      const { lessonIds } = req.body;
      const service = LessonService.getInstance();

      await service.reorderLessons(courseId, lessonIds);

      return BaseController.ok(res, { message: 'Lessons reordered successfully' });
    } catch (error: any) {
      logger.error('[LessonController.reorderLessons] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
