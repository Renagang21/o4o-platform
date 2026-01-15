/**
 * PartnerEventService
 * 파트너 이벤트 조건 CRUD
 *
 * WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1
 *
 * 허용 필드: name, startDate, endDate, region, targetScope, isActive
 * ❌ 이벤트 콘텐츠
 * ❌ 성과 데이터
 * ❌ 결과 필드
 */

import { AppDataSource } from '../../../database/connection.js';
import { PartnerEvent } from '../entities/PartnerEvent.js';
import type {
  PartnerEventDto,
  CreatePartnerEventDto,
  UpdatePartnerEventDto,
} from '../dto/partner.dto.js';

export class PartnerEventService {
  /**
   * Get all events for partner
   */
  static async getEvents(
    partnerId: string,
    serviceId: string
  ): Promise<PartnerEventDto[]> {
    const eventRepo = AppDataSource.getRepository(PartnerEvent);

    const events = await eventRepo.find({
      where: {
        partnerId,
        serviceId,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return events.map((event) => ({
      id: event.id,
      name: event.name,
      period: {
        start: event.startDate,
        end: event.endDate,
      },
      region: event.region,
      targetScope: event.targetScope,
      isActive: event.isActive,
      status: event.getStatus(),
    }));
  }

  /**
   * Create new event
   */
  static async createEvent(
    partnerId: string,
    serviceId: string,
    data: CreatePartnerEventDto
  ): Promise<PartnerEventDto> {
    const eventRepo = AppDataSource.getRepository(PartnerEvent);

    const event = eventRepo.create({
      partnerId,
      serviceId,
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      region: data.region,
      targetScope: data.targetScope,
      isActive: true,
    });

    const saved = await eventRepo.save(event);

    return {
      id: saved.id,
      name: saved.name,
      period: {
        start: saved.startDate,
        end: saved.endDate,
      },
      region: saved.region,
      targetScope: saved.targetScope,
      isActive: saved.isActive,
      status: saved.getStatus(),
    };
  }

  /**
   * Update event
   */
  static async updateEvent(
    partnerId: string,
    serviceId: string,
    eventId: string,
    data: UpdatePartnerEventDto
  ): Promise<PartnerEventDto | null> {
    const eventRepo = AppDataSource.getRepository(PartnerEvent);

    // Find event ensuring it belongs to this partner
    const event = await eventRepo.findOne({
      where: {
        id: eventId,
        partnerId,
        serviceId,
      },
    });

    if (!event) {
      return null;
    }

    // Update only allowed fields
    if (data.name !== undefined) event.name = data.name;
    if (data.startDate !== undefined) event.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) event.endDate = new Date(data.endDate);
    if (data.region !== undefined) event.region = data.region;
    if (data.targetScope !== undefined) event.targetScope = data.targetScope;
    if (data.isActive !== undefined) event.isActive = data.isActive;

    const saved = await eventRepo.save(event);

    return {
      id: saved.id,
      name: saved.name,
      period: {
        start: saved.startDate,
        end: saved.endDate,
      },
      region: saved.region,
      targetScope: saved.targetScope,
      isActive: saved.isActive,
      status: saved.getStatus(),
    };
  }

  /**
   * Get single event by ID
   */
  static async getEventById(
    partnerId: string,
    serviceId: string,
    eventId: string
  ): Promise<PartnerEventDto | null> {
    const eventRepo = AppDataSource.getRepository(PartnerEvent);

    const event = await eventRepo.findOne({
      where: {
        id: eventId,
        partnerId,
        serviceId,
      },
    });

    if (!event) {
      return null;
    }

    return {
      id: event.id,
      name: event.name,
      period: {
        start: event.startDate,
        end: event.endDate,
      },
      region: event.region,
      targetScope: event.targetScope,
      isActive: event.isActive,
      status: event.getStatus(),
    };
  }
}
