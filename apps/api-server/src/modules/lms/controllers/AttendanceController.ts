import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { AttendanceService } from '../services/AttendanceService.js';
import logger from '../../../utils/logger.js';

/**
 * AttendanceController
 * LMS Module - Attendance Management
 * Handles event attendance tracking and check-in
 */
export class AttendanceController extends BaseController {
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
      const service = AttendanceService.getInstance();

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
