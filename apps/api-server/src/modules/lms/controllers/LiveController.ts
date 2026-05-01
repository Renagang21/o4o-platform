import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { LiveService } from '../services/LiveService.js';
import { LessonService } from '../services/LessonService.js';
import { CourseService } from '../services/CourseService.js';
import logger from '../../../utils/logger.js';

/**
 * LiveController
 *
 * WO-O4O-LMS-LIVE-MINIMAL-V1
 */
export class LiveController extends BaseController {
  /**
   * Verify the user owns the parent course (or is kpa:admin).
   */
  private static async checkLessonOwnership(
    lessonId: string,
    userId: string,
    userRoles: string[],
  ): Promise<{ allowed: boolean; notFound: boolean }> {
    const lesson = await LessonService.getInstance().getLesson(lessonId);
    if (!lesson) return { allowed: false, notFound: true };
    if (userRoles.includes('kpa:admin')) return { allowed: true, notFound: false };

    const course = await CourseService.getInstance().getCourse(lesson.courseId);
    if (!course) return { allowed: false, notFound: true };
    return { allowed: course.instructorId === userId, notFound: false };
  }

  /**
   * POST /api/v1/lms/lessons/:lessonId/live
   * Upsert live config (instructor).
   * Body: { liveStartAt, liveEndAt, liveUrl }
   */
  static async upsertLive(req: Request, res: Response): Promise<any> {
    try {
      const { lessonId } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];
      const { liveStartAt, liveEndAt, liveUrl } = req.body || {};

      if (!userId) return BaseController.unauthorized(res, 'User not authenticated');
      if (!liveStartAt || !liveEndAt || !liveUrl) {
        return BaseController.error(res, 'liveStartAt, liveEndAt, liveUrl are required', 400);
      }

      const own = await LiveController.checkLessonOwnership(lessonId, userId, userRoles);
      if (own.notFound) return BaseController.notFound(res, 'Lesson not found');
      if (!own.allowed) {
        return BaseController.forbidden(res, 'You can only manage live lessons in your own courses');
      }

      const service = LiveService.getInstance();
      const lesson = await service.upsertLive(lessonId, { liveStartAt, liveEndAt, liveUrl });

      return BaseController.ok(res, {
        live: {
          lessonId: lesson.id,
          liveStartAt: lesson.liveStartAt ? lesson.liveStartAt.toISOString() : null,
          liveEndAt: lesson.liveEndAt ? lesson.liveEndAt.toISOString() : null,
          liveUrl: lesson.liveUrl ?? null,
        },
      });
    } catch (error: any) {
      logger.error('[LiveController.upsertLive] Error', { error: error.message });
      if (error.message === 'LESSON_NOT_FOUND') return BaseController.notFound(res, 'Lesson not found');
      if (error.message === 'INVALID_RANGE') {
        return BaseController.error(res, 'liveStartAt must be before liveEndAt', 400);
      }
      if (error.message === 'INVALID_YOUTUBE_URL') {
        return BaseController.error(res, 'liveUrl must be a YouTube URL (youtube.com or youtu.be)', 400);
      }
      return BaseController.error(res, error);
    }
  }

  /**
   * GET /api/v1/lms/lessons/:lessonId/live
   * Get live config for a lesson.
   */
  static async getLiveForLesson(req: Request, res: Response): Promise<any> {
    try {
      const { lessonId } = req.params;
      const service = LiveService.getInstance();
      const live = await service.getLiveByLesson(lessonId);

      if (!live) return BaseController.notFound(res, 'Live not configured for this lesson');

      return BaseController.ok(res, { live });
    } catch (error: any) {
      logger.error('[LiveController.getLiveForLesson] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * POST /api/v1/lms/lessons/:lessonId/live/join
   * Mark live lesson as completed for the current user (learner clicked "참여하기").
   */
  static async joinLive(req: Request, res: Response): Promise<any> {
    try {
      const { lessonId } = req.params;
      const userId = (req as any).user?.id;
      if (!userId) return BaseController.unauthorized(res, 'User not authenticated');

      const service = LiveService.getInstance();
      const result = await service.joinLive(lessonId, userId);

      return BaseController.ok(res, result);
    } catch (error: any) {
      logger.error('[LiveController.joinLive] Error', { error: error.message });
      if (error.message === 'LESSON_NOT_FOUND') return BaseController.notFound(res, 'Lesson not found');
      return BaseController.error(res, error);
    }
  }
}
