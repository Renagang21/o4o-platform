import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { EnrollmentService } from '../services/EnrollmentService.js';
import logger from '../../../utils/logger.js';

/**
 * EnrollmentController
 * LMS Module - Enrollment Management
 * Handles course enrollment and student management
 */
export class EnrollmentController extends BaseController {
  static async enrollCourse(req: Request, res: Response): Promise<any> {
    try {
      const { courseId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return BaseController.unauthorized(res, 'User not authenticated');
      }

      const data = { courseId, userId };
      const service = EnrollmentService.getInstance();

      const enrollment = await service.enrollCourse(data);

      return BaseController.created(res, { enrollment });
    } catch (error: any) {
      logger.error('[EnrollmentController.enrollCourse] Error', { error: error.message });

      if (error.message && error.message.includes('already enrolled')) {
        return BaseController.error(res, error.message, 409);
      }

      if (error.message && (error.message.includes('full') || error.message.includes('not available'))) {
        return BaseController.error(res, error.message, 400);
      }

      return BaseController.error(res, error);
    }
  }

  static async getEnrollment(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = EnrollmentService.getInstance();

      const enrollment = await service.getEnrollment(id);

      if (!enrollment) {
        return BaseController.notFound(res, 'Enrollment not found');
      }

      return BaseController.ok(res, { enrollment });
    } catch (error: any) {
      logger.error('[EnrollmentController.getEnrollment] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listEnrollments(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = EnrollmentService.getInstance();

      const { enrollments, total } = await service.listEnrollments(filters as any);

      return BaseController.okPaginated(res, enrollments, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        totalPages: Math.ceil(total / (Number(filters.limit) || 20))
      });
    } catch (error: any) {
      logger.error('[EnrollmentController.listEnrollments] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getMyEnrollments(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return BaseController.unauthorized(res, 'User not authenticated');
      }

      const filters: any = { ...req.query, userId };
      const service = EnrollmentService.getInstance();

      const { enrollments, total } = await service.listEnrollments(filters);

      return BaseController.okPaginated(res, enrollments, {
        total,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        totalPages: Math.ceil(total / (Number(req.query.limit) || 20))
      });
    } catch (error: any) {
      logger.error('[EnrollmentController.getMyEnrollments] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateEnrollment(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const service = EnrollmentService.getInstance();

      const enrollment = await service.updateEnrollment(id, data);

      return BaseController.ok(res, { enrollment });
    } catch (error: any) {
      logger.error('[EnrollmentController.updateEnrollment] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async startEnrollment(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = EnrollmentService.getInstance();

      const enrollment = await service.startEnrollment(id);

      return BaseController.ok(res, { enrollment, message: 'Enrollment started successfully' });
    } catch (error: any) {
      logger.error('[EnrollmentController.startEnrollment] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async completeEnrollment(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { finalScore } = req.body;
      const service = EnrollmentService.getInstance();

      const enrollment = await service.completeEnrollment(id, finalScore);

      return BaseController.ok(res, { enrollment, message: 'Enrollment completed successfully' });
    } catch (error: any) {
      logger.error('[EnrollmentController.completeEnrollment] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async cancelEnrollment(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = EnrollmentService.getInstance();

      const enrollment = await service.cancelEnrollment(id);

      return BaseController.ok(res, { enrollment, message: 'Enrollment cancelled successfully' });
    } catch (error: any) {
      logger.error('[EnrollmentController.cancelEnrollment] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }
}
