import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { Attendance, AttendanceStatus } from '@o4o/lms-core';
import { EventService } from './EventService.js';
import logger from '../../../utils/logger.js';

export interface CheckInRequest {
  eventId: string;
  userId: string;
  attendanceCode?: string;
  geoLocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface MarkAttendanceRequest {
  eventId: string;
  userId: string;
  status: AttendanceStatus;
  notes?: string;
  markedBy?: string;
}

export interface UpdateAttendanceRequest {
  status?: AttendanceStatus;
  notes?: string;
}

export interface AttendanceFilters {
  status?: AttendanceStatus;
  eventId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export class AttendanceService extends BaseService<Attendance> {
  private static instance: AttendanceService;
  private attendanceRepository: Repository<Attendance>;
  private eventService: EventService;

  constructor() {
    const attendanceRepository = AppDataSource.getRepository(Attendance);
    super(attendanceRepository);
    this.attendanceRepository = attendanceRepository;
    this.eventService = EventService.getInstance();
  }

  static getInstance(): AttendanceService {
    if (!AttendanceService.instance) {
      AttendanceService.instance = new AttendanceService();
    }
    return AttendanceService.instance;
  }

  async checkIn(data: CheckInRequest): Promise<Attendance> {
    // Get event
    const event = await this.eventService.getEvent(data.eventId);
    if (!event) {
      throw new Error(`Event not found: ${data.eventId}`);
    }

    // Verify attendance code if required
    if (event.requiresAttendance && event.attendanceCode) {
      if (!data.attendanceCode || data.attendanceCode !== event.attendanceCode) {
        throw new Error('Invalid attendance code');
      }
    }

    // Check if already checked in
    let attendance = await this.attendanceRepository.findOne({
      where: {
        eventId: data.eventId,
        userId: data.userId
      }
    });

    const now = new Date();
    const isLate = now > event.startAt;

    if (!attendance) {
      attendance = this.attendanceRepository.create({
        eventId: data.eventId,
        userId: data.userId,
        status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
        checkInMethod: data.attendanceCode ? 'code' : 'manual'
      });
    }

    // Mark present or late
    if (isLate) {
      attendance.markLate(data.attendanceCode);
    } else {
      attendance.markPresent(data.attendanceCode);
    }

    // Set geo location if provided
    if (data.geoLocation) {
      attendance.setGeoLocation(data.geoLocation.latitude, data.geoLocation.longitude);
    }

    const saved = await this.attendanceRepository.save(attendance);

    logger.info(`[LMS] Attendance checked in`, {
      attendanceId: saved.id,
      eventId: data.eventId,
      userId: data.userId,
      status: saved.status
    });

    return saved;
  }

  async markAttendance(data: MarkAttendanceRequest): Promise<Attendance> {
    // Check if already exists
    let attendance = await this.attendanceRepository.findOne({
      where: {
        eventId: data.eventId,
        userId: data.userId
      }
    });

    if (!attendance) {
      attendance = this.attendanceRepository.create({
        eventId: data.eventId,
        userId: data.userId,
        status: data.status,
        checkInMethod: 'manual',
        markedBy: data.markedBy
      });
    }

    // Mark attendance based on status
    switch (data.status) {
      case AttendanceStatus.PRESENT:
        attendance.markPresent(undefined, 'manual');
        break;
      case AttendanceStatus.LATE:
        attendance.markLate();
        break;
      case AttendanceStatus.ABSENT:
        attendance.markAbsent(data.notes, data.markedBy);
        break;
      case AttendanceStatus.EXCUSED:
        attendance.markExcused(data.notes || '', data.markedBy);
        break;
    }

    const saved = await this.attendanceRepository.save(attendance);

    logger.info(`[LMS] Attendance marked`, {
      attendanceId: saved.id,
      eventId: data.eventId,
      userId: data.userId,
      status: data.status
    });

    return saved;
  }

  async getAttendance(id: string): Promise<Attendance | null> {
    return this.attendanceRepository.findOne({
      where: { id },
      relations: ['event', 'user']
    });
  }

  async listAttendance(filters: AttendanceFilters = {}): Promise<{ attendance: Attendance[]; total: number }> {
    const {
      status,
      eventId,
      userId,
      page = 1,
      limit = 100
    } = filters;

    const query = this.attendanceRepository.createQueryBuilder('attendance');

    if (status) {
      query.andWhere('attendance.status = :status', { status });
    }

    if (eventId) {
      query.andWhere('attendance.eventId = :eventId', { eventId });
    }

    if (userId) {
      query.andWhere('attendance.userId = :userId', { userId });
    }

    query
      .orderBy('attendance.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    query.leftJoinAndSelect('attendance.event', 'event');
    query.leftJoinAndSelect('attendance.user', 'user');

    const [attendance, total] = await query.getManyAndCount();

    return { attendance, total };
  }

  async updateAttendance(id: string, data: UpdateAttendanceRequest): Promise<Attendance> {
    const attendance = await this.getAttendance(id);
    if (!attendance) {
      throw new Error(`Attendance not found: ${id}`);
    }

    Object.assign(attendance, data);

    const updated = await this.attendanceRepository.save(attendance);

    logger.info(`[LMS] Attendance updated`, { id: updated.id });

    return updated;
  }
}
