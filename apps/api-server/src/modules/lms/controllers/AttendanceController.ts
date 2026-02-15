import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { AttendanceService } from '../services/AttendanceService.js';
import { EventService } from '../services/EventService.js';
import { CourseService } from '../services/CourseService.js';
import logger from '../../../utils/logger.js';

/**
 * AttendanceController
 * LMS Module - Attendance Management
 *
 * WO-KPA-A-LMS-COURSE-OWNERSHIP-GUARD-V1:
 * - markAttendance/updateAttendance verify event ownership
 * - checkIn is user-initiated (no ownership check)
 * - kpa:admin bypasses ownership check
 */
export class AttendanceController extends BaseController {
  private static async checkEventOwnership(eventId: string, userId: string, userRoles: string[]): Promise<boolean> {
    if (userRoles.includes('kpa:admin')) return true;
    const eventService = EventService.getInstance();
    const event = await eventService.getEvent(eventId);
    if (!event) return false;
    if (event.instructorId && event.instructorId === userId) return true;
    if (event.courseId) {
      const courseService = CourseService.getInstance();
      const course = await courseService.getCourse(event.courseId);
      if (course && course.instructorId === userId) return true;
    }
    return false;
  }

  static async checkIn(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return BaseController.unauthorized(res, 'User not authenticated');
      }

      const data = { ...req.body, userId };
      const service = AttendanceService.getInstance();

      const attendance = await service.checkIn(data);

      return BaseController.created(res, { attendance });
    } catch (error: any) {
      logger.error('[AttendanceController.checkIn] Error', { error: error.message });

      if (error.message && error.message.includes('Invalid attendance code')) {
        return BaseController.error(res, error.message, 400);
      }

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async markAttendance(req: Request, res: Response): Promise<any> {
    try {
      const { eventId } = req.params;
      const markedBy = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const allowed = await AttendanceController.checkEventOwnership(eventId, markedBy, userRoles);
      if (!allowed) {
        return BaseController.forbidden(res, 'You can only mark attendance for your own events');
      }

      const data = { ...req.body, eventId, markedBy };
      const service = AttendanceService.getInstance();

      const attendance = await service.markAttendance(data);

      return BaseController.created(res, { attendance });
    } catch (error: any) {
      logger.error('[AttendanceController.markAttendance] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getAttendance(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = AttendanceService.getInstance();

      const attendance = await service.getAttendance(id);

      if (!attendance) {
        return BaseController.notFound(res, 'Attendance record not found');
      }

      return BaseController.ok(res, { attendance });
    } catch (error: any) {
      logger.error('[AttendanceController.getAttendance] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listAttendance(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = AttendanceService.getInstance();

      const { attendance, total } = await service.listAttendance(filters as any);

      return BaseController.okPaginated(res, attendance, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 100,
        totalPages: Math.ceil(total / (Number(filters.limit) || 100))
      });
    } catch (error: any) {
      logger.error('[AttendanceController.listAttendance] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listAttendanceByEvent(req: Request, res: Response): Promise<any> {
    try {
      const { eventId } = req.params;
      const filters: any = { ...req.query, eventId };
      const service = AttendanceService.getInstance();

      const { attendance, total } = await service.listAttendance(filters);

      return BaseController.okPaginated(res, attendance, {
        total,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 100,
        totalPages: Math.ceil(total / (Number(req.query.limit) || 100))
      });
    } catch (error: any) {
      logger.error('[AttendanceController.listAttendanceByEvent] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateAttendance(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];
      const service = AttendanceService.getInstance();

      const existing = await service.getAttendance(id);
      if (!existing) {
        return BaseController.notFound(res, 'Attendance record not found');
      }

      const allowed = await AttendanceController.checkEventOwnership(existing.eventId, userId, userRoles);
      if (!allowed) {
        return BaseController.forbidden(res, 'You can only update attendance for your own events');
      }

      const attendance = await service.updateAttendance(id, data);

      return BaseController.ok(res, { attendance });
    } catch (error: any) {
      logger.error('[AttendanceController.updateAttendance] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }
}
