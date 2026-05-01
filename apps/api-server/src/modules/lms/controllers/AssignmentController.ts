import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { AssignmentService } from '../services/AssignmentService.js';
import { LessonService } from '../services/LessonService.js';
import { CourseService } from '../services/CourseService.js';
import logger from '../../../utils/logger.js';

/**
 * AssignmentController
 *
 * WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1
 */
export class AssignmentController extends BaseController {
  /**
   * Verify the requesting user owns the course (or is kpa:admin).
   */
  private static async checkLessonOwnership(
    lessonId: string,
    userId: string,
    userRoles: string[],
  ): Promise<{ allowed: boolean; notFound: boolean; courseId?: string }> {
    if (userRoles.includes('kpa:admin')) {
      const lesson = await LessonService.getInstance().getLesson(lessonId);
      if (!lesson) return { allowed: false, notFound: true };
      return { allowed: true, notFound: false, courseId: lesson.courseId };
    }

    const lesson = await LessonService.getInstance().getLesson(lessonId);
    if (!lesson) return { allowed: false, notFound: true };

    const course = await CourseService.getInstance().getCourse(lesson.courseId);
    if (!course) return { allowed: false, notFound: true };

    return { allowed: course.instructorId === userId, notFound: false, courseId: lesson.courseId };
  }

  /**
   * POST /api/v1/lms/assignments
   * Upsert assignment (instructor).
   * Body: { lessonId, instructions?, dueDate? }
   */
  static async upsertAssignment(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];
      const { lessonId, instructions, dueDate } = req.body || {};

      if (!userId) return BaseController.unauthorized(res, 'User not authenticated');
      if (!lessonId) return BaseController.error(res, 'lessonId is required', 400);

      const own = await AssignmentController.checkLessonOwnership(lessonId, userId, userRoles);
      if (own.notFound) return BaseController.notFound(res, 'Lesson not found');
      if (!own.allowed) {
        return BaseController.forbidden(res, 'You can only manage assignments in your own courses');
      }

      const service = AssignmentService.getInstance();
      const assignment = await service.upsertAssignment({ lessonId, instructions, dueDate });

      return BaseController.ok(res, { assignment });
    } catch (error: any) {
      logger.error('[AssignmentController.upsertAssignment] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * GET /api/v1/lms/lessons/:lessonId/assignment
   * Get assignment for a lesson (instructor or learner).
   */
  static async getAssignmentForLesson(req: Request, res: Response): Promise<any> {
    try {
      const { lessonId } = req.params;
      const service = AssignmentService.getInstance();
      const assignment = await service.getAssignmentByLesson(lessonId);

      if (!assignment) return BaseController.notFound(res, 'Assignment not found for this lesson');

      return BaseController.ok(res, { assignment });
    } catch (error: any) {
      logger.error('[AssignmentController.getAssignmentForLesson] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * POST /api/v1/lms/assignments/:assignmentId/submit
   * Submit (or re-submit) assignment as learner.
   * Body: { content }
   */
  static async submitAssignment(req: Request, res: Response): Promise<any> {
    try {
      const { assignmentId } = req.params;
      const userId = (req as any).user?.id;
      const { content } = req.body || {};

      if (!userId) return BaseController.unauthorized(res, 'User not authenticated');
      if (typeof content !== 'string' || content.trim().length === 0) {
        return BaseController.error(res, 'content is required', 400);
      }

      const service = AssignmentService.getInstance();
      const result = await service.submitAssignment(assignmentId, userId, { content });

      return BaseController.ok(res, result);
    } catch (error: any) {
      logger.error('[AssignmentController.submitAssignment] Error', { error: error.message });
      if (error.message?.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }
      return BaseController.error(res, error);
    }
  }

  /**
   * GET /api/v1/lms/assignments/:assignmentId/my
   * Get current user's submission.
   */
  static async getMySubmission(req: Request, res: Response): Promise<any> {
    try {
      const { assignmentId } = req.params;
      const userId = (req as any).user?.id;
      if (!userId) return BaseController.unauthorized(res, 'User not authenticated');

      const service = AssignmentService.getInstance();
      const submission = await service.getMySubmission(assignmentId, userId);

      return BaseController.ok(res, { submission });
    } catch (error: any) {
      logger.error('[AssignmentController.getMySubmission] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
