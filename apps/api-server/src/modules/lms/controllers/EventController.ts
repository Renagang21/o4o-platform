import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { EventService } from '../services/EventService.js';
import { CourseService } from '../services/CourseService.js';
import logger from '../../../utils/logger.js';

/**
 * EventController
 * LMS Module - Event Management
 * Handles event scheduling and management
 *
 * WO-KPA-A-LMS-COURSE-OWNERSHIP-GUARD-V1:
 * - Write operations verify event's parent course.instructorId === userId
 * - kpa:admin bypasses ownership check
 */
export class EventController extends BaseController {
  private static async checkEventOwnership(eventId: string, userId: string, userRoles: string[]): Promise<{ allowed: boolean; notFound: boolean }> {
    if (userRoles.includes('kpa:admin')) return { allowed: true, notFound: false };
    const eventService = EventService.getInstance();
    const event = await eventService.getEvent(eventId);
    if (!event) return { allowed: false, notFound: true };
    // Check event's own instructorId first, then fall back to course ownership
    if (event.instructorId && event.instructorId === userId) return { allowed: true, notFound: false };
    if (event.courseId) {
      const courseService = CourseService.getInstance();
      const course = await courseService.getCourse(event.courseId);
      if (course && course.instructorId === userId) return { allowed: true, notFound: false };
    }
    return { allowed: false, notFound: false };
  }

  static async createEvent(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      // If courseId provided, verify course ownership
      if (data.courseId && !userRoles.includes('kpa:admin')) {
        const courseService = CourseService.getInstance();
        const course = await courseService.getCourse(data.courseId);
        if (!course) return BaseController.notFound(res, 'Course not found');
        if (course.instructorId !== userId) {
          return BaseController.forbidden(res, 'You can only create events for your own courses');
        }
      }

      // Set instructorId to current user if not specified
      if (!data.instructorId && userId) {
        data.instructorId = userId;
      }

      const service = EventService.getInstance();
      const event = await service.createEvent(data);

      return BaseController.created(res, { event });
    } catch (error: any) {
      logger.error('[EventController.createEvent] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getEvent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = EventService.getInstance();

      const event = await service.getEvent(id);

      if (!event) {
        return BaseController.notFound(res, 'Event not found');
      }

      return BaseController.ok(res, { event });
    } catch (error: any) {
      logger.error('[EventController.getEvent] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listEvents(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = EventService.getInstance();

      const { events, total } = await service.listEvents(filters as any);

      return BaseController.okPaginated(res, events, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        totalPages: Math.ceil(total / (Number(filters.limit) || 20))
      });
    } catch (error: any) {
      logger.error('[EventController.listEvents] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateEvent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await EventController.checkEventOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Event not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only modify your own events');

      const service = EventService.getInstance();
      const event = await service.updateEvent(id, data);

      return BaseController.ok(res, { event });
    } catch (error: any) {
      logger.error('[EventController.updateEvent] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async deleteEvent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await EventController.checkEventOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Event not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only delete your own events');

      const service = EventService.getInstance();
      await service.deleteEvent(id);

      return BaseController.ok(res, { message: 'Event deleted successfully' });
    } catch (error: any) {
      logger.error('[EventController.deleteEvent] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async startEvent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await EventController.checkEventOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Event not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only start your own events');

      const service = EventService.getInstance();
      const event = await service.startEvent(id);

      return BaseController.ok(res, { event, message: 'Event started successfully' });
    } catch (error: any) {
      logger.error('[EventController.startEvent] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async completeEvent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await EventController.checkEventOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Event not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only complete your own events');

      const service = EventService.getInstance();
      const event = await service.completeEvent(id);

      return BaseController.ok(res, { event, message: 'Event completed successfully' });
    } catch (error: any) {
      logger.error('[EventController.completeEvent] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async cancelEvent(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await EventController.checkEventOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Event not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only cancel your own events');

      const service = EventService.getInstance();
      const event = await service.cancelEvent(id);

      return BaseController.ok(res, { event, message: 'Event cancelled successfully' });
    } catch (error: any) {
      logger.error('[EventController.cancelEvent] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }
}
