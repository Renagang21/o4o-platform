import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { CompletionService } from '../services/CompletionService.js';
import { CourseService } from '../services/CourseService.js';
import logger from '../../../utils/logger.js';
// WO-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1
import { resolveScopeOrRespond } from '../utils/lms-scope-guard.js';

/**
 * CompletionController
 *
 * WO-O4O-COMPLETION-V1
 * Handles course completion record queries.
 */
export class CompletionController extends BaseController {
  /**
   * GET /api/v1/lms/completions/me
   * Get current user's course completions (with course info)
   */
  static async getMyCompletions(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return BaseController.unauthorized(res, 'User not authenticated');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const scope = resolveScopeOrRespond(req, res);
      if (!scope.ok) return;

      const service = CompletionService.getInstance();
      const { completions, total } = await service.getMyCompletions(userId, page, limit, scope.scope);

      // Enrich with course info
      const courseService = CourseService.getInstance();
      const enriched = await Promise.all(
        completions.map(async (c) => {
          const course = await courseService.getCourse(c.courseId);
          return {
            id: c.id,
            courseId: c.courseId,
            courseTitle: course?.title ?? '(삭제된 코스)',
            enrollmentId: c.enrollmentId,
            completedAt: c.completedAt,
          };
        }),
      );

      return BaseController.okPaginated(res, enriched, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error: any) {
      logger.error('[CompletionController.getMyCompletions] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
