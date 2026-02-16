import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { CourseService } from '../services/CourseService.js';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';
import logger from '../../../utils/logger.js';

/**
 * CourseController
 * LMS Module - Course Management
 * Handles Course CRUD and publishing operations
 *
 * WO-KPA-A-LMS-COURSE-OWNERSHIP-GUARD-V1:
 * - All write operations verify course.instructorId === userId
 * - kpa:admin bypasses ownership check
 */
export class CourseController extends BaseController {
  private static isOwnerOrAdmin(userId: string, courseInstructorId: string, userRoles: string[]): boolean {
    if (userRoles.includes('kpa:admin')) return true;
    return courseInstructorId === userId;
  }

  static async createCourse(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const userId = (req as any).user?.id;

      // WO-LMS-INSTRUCTOR-ROLE-V1: 유료 과정은 강사만 생성 가능
      // WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: platform:* → kpa:admin
      if (data.isPaid && userId) {
        const hasInstructorRole = await roleAssignmentService.hasAnyRole(userId, [
          'lms:instructor',
          'kpa:admin',
        ]);
        if (!hasInstructorRole) {
          return BaseController.forbidden(res, '유료 과정은 강사만 생성할 수 있습니다');
        }
      }

      // Set instructorId to current user if not specified
      if (!data.instructorId && userId) {
        data.instructorId = userId;
      }

      const service = CourseService.getInstance();
      const course = await service.createCourse(data);

      return BaseController.created(res, { course });
    } catch (error: any) {
      logger.error('[CourseController.createCourse] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getCourse(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = CourseService.getInstance();

      const course = await service.getCourse(id);

      if (!course) {
        return BaseController.notFound(res, 'Course not found');
      }

      return BaseController.ok(res, { course });
    } catch (error: any) {
      logger.error('[CourseController.getCourse] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listCourses(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = CourseService.getInstance();

      const { courses, total } = await service.listCourses(filters as any);

      return BaseController.okPaginated(res, courses, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        totalPages: Math.ceil(total / (Number(filters.limit) || 20))
      });
    } catch (error: any) {
      // Graceful fallback: return empty data if table doesn't exist
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        logger.warn('[CourseController.listCourses] LMS tables not found - returning empty courses');
        return BaseController.okPaginated(res, [], {
          total: 0,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          totalPages: 0
        });
      }
      logger.error('[CourseController.listCourses] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateCourse(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];
      const service = CourseService.getInstance();

      const course = await service.getCourse(id);
      if (!course) {
        return BaseController.notFound(res, 'Course not found');
      }
      if (!CourseController.isOwnerOrAdmin(userId, course.instructorId, userRoles)) {
        return BaseController.forbidden(res, 'You can only modify your own courses');
      }

      const updated = await service.updateCourse(id, data);

      return BaseController.ok(res, { course: updated });
    } catch (error: any) {
      logger.error('[CourseController.updateCourse] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async deleteCourse(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];
      const service = CourseService.getInstance();

      const course = await service.getCourse(id);
      if (!course) {
        return BaseController.notFound(res, 'Course not found');
      }
      if (!CourseController.isOwnerOrAdmin(userId, course.instructorId, userRoles)) {
        return BaseController.forbidden(res, 'You can only delete your own courses');
      }

      await service.deleteCourse(id);

      return BaseController.ok(res, { message: 'Course archived successfully' });
    } catch (error: any) {
      logger.error('[CourseController.deleteCourse] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async publishCourse(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];
      const service = CourseService.getInstance();

      const course = await service.getCourse(id);
      if (!course) {
        return BaseController.notFound(res, 'Course not found');
      }
      if (!CourseController.isOwnerOrAdmin(userId, course.instructorId, userRoles)) {
        return BaseController.forbidden(res, 'You can only publish your own courses');
      }

      const updated = await service.publishCourse(id);

      return BaseController.ok(res, { course: updated, message: 'Course published successfully' });
    } catch (error: any) {
      logger.error('[CourseController.publishCourse] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async unpublishCourse(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];
      const service = CourseService.getInstance();

      const course = await service.getCourse(id);
      if (!course) {
        return BaseController.notFound(res, 'Course not found');
      }
      if (!CourseController.isOwnerOrAdmin(userId, course.instructorId, userRoles)) {
        return BaseController.forbidden(res, 'You can only unpublish your own courses');
      }

      const updated = await service.unpublishCourse(id);

      return BaseController.ok(res, { course: updated, message: 'Course unpublished successfully' });
    } catch (error: any) {
      logger.error('[CourseController.unpublishCourse] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async archiveCourse(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];
      const service = CourseService.getInstance();

      const course = await service.getCourse(id);
      if (!course) {
        return BaseController.notFound(res, 'Course not found');
      }
      if (!CourseController.isOwnerOrAdmin(userId, course.instructorId, userRoles)) {
        return BaseController.forbidden(res, 'You can only archive your own courses');
      }

      const updated = await service.archiveCourse(id);

      return BaseController.ok(res, { course: updated, message: 'Course archived successfully' });
    } catch (error: any) {
      logger.error('[CourseController.archiveCourse] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }
}
