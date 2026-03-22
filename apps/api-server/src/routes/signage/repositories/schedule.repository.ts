import { DataSource, Repository } from 'typeorm';
import { SignageSchedule } from '@o4o-apps/digital-signage-core/entities';
import type { ScheduleQueryDto, ScopeFilter } from '../dto/index.js';

export class SignageScheduleRepository {
  private scheduleRepo: Repository<SignageSchedule>;

  constructor(private dataSource: DataSource) {
    this.scheduleRepo = dataSource.getRepository(SignageSchedule);
  }

  async findScheduleById(id: string, scope: ScopeFilter): Promise<SignageSchedule | null> {
    return this.scheduleRepo.findOne({
      where: {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      relations: ['playlist'],
    });
  }

  async findSchedules(
    query: ScheduleQueryDto,
    scope: ScopeFilter,
  ): Promise<{ data: SignageSchedule[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.scheduleRepo.createQueryBuilder('schedule');

    qb.where('schedule.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    if (scope.organizationId) {
      qb.andWhere('schedule.organizationId = :organizationId', {
        organizationId: scope.organizationId,
      });
    }

    qb.andWhere('schedule.deletedAt IS NULL');

    if (query.channelId) {
      qb.andWhere('schedule.channelId = :channelId', { channelId: query.channelId });
    }
    if (query.playlistId) {
      qb.andWhere('schedule.playlistId = :playlistId', { playlistId: query.playlistId });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('schedule.isActive = :isActive', { isActive: query.isActive });
    }

    const sortBy = query.sortBy || 'priority';
    const sortOrder = sortBy === 'priority' ? 'DESC' : (query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC');
    qb.orderBy(`schedule.${sortBy}`, sortOrder);

    qb.skip(skip).take(limit);

    qb.leftJoinAndSelect('schedule.playlist', 'playlist');

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async createSchedule(data: Partial<SignageSchedule>): Promise<SignageSchedule> {
    const schedule = this.scheduleRepo.create(data);
    return this.scheduleRepo.save(schedule);
  }

  async updateSchedule(
    id: string,
    data: Partial<SignageSchedule>,
    scope: ScopeFilter,
  ): Promise<SignageSchedule | null> {
    const schedule = await this.findScheduleById(id, scope);
    if (!schedule) return null;

    Object.assign(schedule, data);
    return this.scheduleRepo.save(schedule);
  }

  async softDeleteSchedule(id: string, scope: ScopeFilter): Promise<boolean> {
    const result = await this.scheduleRepo.update(
      {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      { deletedAt: new Date() },
    );
    return (result.affected || 0) > 0;
  }

  async findActiveSchedule(
    channelId: string | null,
    scope: ScopeFilter,
    currentTime: Date = new Date(),
  ): Promise<SignageSchedule | null> {
    const dayOfWeek = currentTime.getDay();
    const timeString = currentTime.toTimeString().slice(0, 8);

    const qb = this.scheduleRepo.createQueryBuilder('schedule');

    qb.where('schedule.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    if (scope.organizationId) {
      qb.andWhere('schedule.organizationId = :organizationId', {
        organizationId: scope.organizationId,
      });
    }

    qb.andWhere('schedule.deletedAt IS NULL');
    qb.andWhere('schedule.isActive = true');

    if (channelId) {
      qb.andWhere('(schedule.channelId = :channelId OR schedule.channelId IS NULL)', {
        channelId,
      });
    }

    qb.andWhere(':dayOfWeek = ANY(schedule.daysOfWeek)', { dayOfWeek });

    qb.andWhere('schedule.startTime <= :time', { time: timeString });
    qb.andWhere('schedule.endTime > :time', { time: timeString });

    const dateString = currentTime.toISOString().slice(0, 10);
    qb.andWhere('(schedule.validFrom IS NULL OR schedule.validFrom <= :date)', { date: dateString });
    qb.andWhere('(schedule.validUntil IS NULL OR schedule.validUntil >= :date)', { date: dateString });

    qb.orderBy('schedule.priority', 'DESC');
    qb.addOrderBy('schedule.channelId', 'DESC', 'NULLS LAST');

    qb.leftJoinAndSelect('schedule.playlist', 'playlist');

    return qb.getOne();
  }

  async findSchedulesForCalendar(
    scope: ScopeFilter,
    startDate: Date,
    endDate: Date,
    channelId?: string,
  ): Promise<SignageSchedule[]> {
    const qb = this.scheduleRepo.createQueryBuilder('schedule');

    qb.where('schedule.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    if (scope.organizationId) {
      qb.andWhere('schedule.organizationId = :organizationId', {
        organizationId: scope.organizationId,
      });
    }

    qb.andWhere('schedule.deletedAt IS NULL');
    qb.andWhere('schedule.isActive = true');

    if (channelId) {
      qb.andWhere('(schedule.channelId = :channelId OR schedule.channelId IS NULL)', {
        channelId,
      });
    }

    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);
    qb.andWhere('(schedule.validFrom IS NULL OR schedule.validFrom <= :endDate)', { endDate: endStr });
    qb.andWhere('(schedule.validUntil IS NULL OR schedule.validUntil >= :startDate)', { startDate: startStr });

    qb.orderBy('schedule.priority', 'DESC');
    qb.leftJoinAndSelect('schedule.playlist', 'playlist');

    return qb.getMany();
  }
}
