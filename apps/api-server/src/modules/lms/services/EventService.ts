import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { LMSEvent, LMSEventType, EventStatus } from '@o4o/lms-core';
import logger from '../../../utils/logger.js';

export interface CreateEventRequest {
  courseId: string;
  title: string;
  description?: string;
  type: LMSEventType;
  startAt: Date;
  endAt: Date;
  location?: string;
  onlineUrl?: string;
  isOnline?: boolean;
  instructorId?: string;
  organizationId?: string;
  requiresAttendance?: boolean;
  maxAttendees?: number;
}

export interface UpdateEventRequest extends Partial<Omit<CreateEventRequest, 'courseId'>> {
  status?: EventStatus;
}

export interface EventFilters {
  type?: LMSEventType;
  status?: EventStatus;
  courseId?: string;
  organizationId?: string;
  isOnline?: boolean;
  page?: number;
  limit?: number;
}

export class EventService extends BaseService<LMSEvent> {
  private static instance: EventService;
  private eventRepository: Repository<LMSEvent>;

  constructor() {
    const eventRepository = AppDataSource.getRepository(LMSEvent);
    super(eventRepository);
    this.eventRepository = eventRepository;
  }

  static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  async createEvent(data: CreateEventRequest): Promise<LMSEvent> {
    const event = this.eventRepository.create({
      ...data,
      status: EventStatus.SCHEDULED,
      currentAttendees: 0,
      attendanceCount: 0,
      isOnline: data.isOnline ?? false,
      requiresAttendance: data.requiresAttendance ?? false
    });

    // Generate attendance code if required
    if (data.requiresAttendance) {
      event.attendanceCode = LMSEvent.generateAttendanceCode();
    }

    const saved = await this.eventRepository.save(event);

    logger.info(`[LMS] Event created: ${saved.title}`, { id: saved.id, courseId: data.courseId });

    return saved;
  }

  async getEvent(id: string): Promise<LMSEvent | null> {
    return this.eventRepository.findOne({
      where: { id },
      relations: ['course', 'instructor', 'organization']
    });
  }

  async listEvents(filters: EventFilters = {}): Promise<{ events: LMSEvent[]; total: number }> {
    const {
      type,
      status,
      courseId,
      organizationId,
      isOnline,
      page = 1,
      limit = 20
    } = filters;

    const query = this.eventRepository.createQueryBuilder('event');

    if (type) {
      query.andWhere('event.type = :type', { type });
    }

    if (status) {
      query.andWhere('event.status = :status', { status });
    }

    if (courseId) {
      query.andWhere('event.courseId = :courseId', { courseId });
    }

    if (organizationId) {
      query.andWhere('event.organizationId = :organizationId', { organizationId });
    }

    if (isOnline !== undefined) {
      query.andWhere('event.isOnline = :isOnline', { isOnline });
    }

    query
      .orderBy('event.startAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    query.leftJoinAndSelect('event.course', 'course');
    query.leftJoinAndSelect('event.instructor', 'instructor');

    const [events, total] = await query.getManyAndCount();

    return { events, total };
  }

  async updateEvent(id: string, data: UpdateEventRequest): Promise<LMSEvent> {
    const event = await this.getEvent(id);
    if (!event) {
      throw new Error(`Event not found: ${id}`);
    }

    Object.assign(event, data);

    const updated = await this.eventRepository.save(event);

    logger.info(`[LMS] Event updated: ${updated.title}`, { id: updated.id });

    return updated;
  }

  async deleteEvent(id: string): Promise<void> {
    const event = await this.getEvent(id);
    if (!event) {
      throw new Error(`Event not found: ${id}`);
    }

    await this.eventRepository.remove(event);

    logger.info(`[LMS] Event deleted: ${event.title}`, { id });
  }

  async startEvent(id: string): Promise<LMSEvent> {
    const event = await this.getEvent(id);
    if (!event) {
      throw new Error(`Event not found: ${id}`);
    }

    event.start();
    const updated = await this.eventRepository.save(event);

    logger.info(`[LMS] Event started: ${updated.title}`, { id: updated.id });

    return updated;
  }

  async completeEvent(id: string): Promise<LMSEvent> {
    const event = await this.getEvent(id);
    if (!event) {
      throw new Error(`Event not found: ${id}`);
    }

    event.complete();
    const updated = await this.eventRepository.save(event);

    logger.info(`[LMS] Event completed: ${updated.title}`, { id: updated.id });

    return updated;
  }

  async cancelEvent(id: string): Promise<LMSEvent> {
    const event = await this.getEvent(id);
    if (!event) {
      throw new Error(`Event not found: ${id}`);
    }

    event.cancel();
    const updated = await this.eventRepository.save(event);

    logger.info(`[LMS] Event cancelled: ${updated.title}`, { id: updated.id });

    return updated;
  }
}
