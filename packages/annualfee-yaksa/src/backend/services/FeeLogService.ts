import { DataSource, Repository } from 'typeorm';
import { FeeLog, FeeLogAction, FeeLogEntityType } from '../entities/FeeLog.js';

export interface CreateLogDto {
  memberId?: string;
  memberName?: string;
  entityType: FeeLogEntityType;
  entityId: string;
  action: FeeLogAction;
  year?: number;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  changedFields?: string[];
  data?: Record<string, any>;
  actorId?: string;
  actorName?: string;
  actorType?: 'user' | 'admin' | 'system' | 'batch';
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface LogFilters {
  memberId?: string;
  entityType?: FeeLogEntityType;
  entityId?: string;
  action?: FeeLogAction | FeeLogAction[];
  year?: number;
  actorId?: string;
  actorType?: 'user' | 'admin' | 'system' | 'batch';
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * FeeLogService
 *
 * 회비 시스템 감사 로그 서비스
 */
export class FeeLogService {
  private repo: Repository<FeeLog>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(FeeLog);
  }

  /**
   * 로그 기록
   */
  async log(dto: CreateLogDto): Promise<FeeLog> {
    const log = this.repo.create({
      ...dto,
      actorType: dto.actorType || 'user',
    });

    return await this.repo.save(log);
  }

  /**
   * 로그 조회 (ID)
   */
  async findById(id: string): Promise<FeeLog | null> {
    return await this.repo.findOne({ where: { id } });
  }

  /**
   * 로그 목록 조회
   */
  async findAll(filters: LogFilters): Promise<{
    logs: FeeLog[];
    total: number;
  }> {
    const queryBuilder = this.repo.createQueryBuilder('log');

    if (filters.memberId) {
      queryBuilder.andWhere('log.memberId = :memberId', {
        memberId: filters.memberId,
      });
    }
    if (filters.entityType) {
      queryBuilder.andWhere('log.entityType = :entityType', {
        entityType: filters.entityType,
      });
    }
    if (filters.entityId) {
      queryBuilder.andWhere('log.entityId = :entityId', {
        entityId: filters.entityId,
      });
    }
    if (filters.action) {
      if (Array.isArray(filters.action)) {
        queryBuilder.andWhere('log.action IN (:...actions)', {
          actions: filters.action,
        });
      } else {
        queryBuilder.andWhere('log.action = :action', {
          action: filters.action,
        });
      }
    }
    if (filters.year) {
      queryBuilder.andWhere('log.year = :year', { year: filters.year });
    }
    if (filters.actorId) {
      queryBuilder.andWhere('log.actorId = :actorId', {
        actorId: filters.actorId,
      });
    }
    if (filters.actorType) {
      queryBuilder.andWhere('log.actorType = :actorType', {
        actorType: filters.actorType,
      });
    }
    if (filters.fromDate) {
      queryBuilder.andWhere('log.createdAt >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }
    if (filters.toDate) {
      queryBuilder.andWhere('log.createdAt <= :toDate', {
        toDate: filters.toDate,
      });
    }

    queryBuilder.orderBy('log.createdAt', 'DESC');

    if (filters.limit) {
      queryBuilder.take(filters.limit);
    }
    if (filters.offset) {
      queryBuilder.skip(filters.offset);
    }

    const [logs, total] = await queryBuilder.getManyAndCount();
    return { logs, total };
  }

  /**
   * 회원별 로그 조회
   */
  async findByMember(
    memberId: string,
    options?: { limit?: number; year?: number }
  ): Promise<FeeLog[]> {
    const queryBuilder = this.repo
      .createQueryBuilder('log')
      .where('log.memberId = :memberId', { memberId });

    if (options?.year) {
      queryBuilder.andWhere('log.year = :year', { year: options.year });
    }

    queryBuilder.orderBy('log.createdAt', 'DESC');

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    return await queryBuilder.getMany();
  }

  /**
   * 엔티티별 로그 조회
   */
  async findByEntity(
    entityType: FeeLogEntityType,
    entityId: string
  ): Promise<FeeLog[]> {
    return await this.repo.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 최근 활동 로그 조회
   */
  async getRecentActivity(
    options?: {
      limit?: number;
      excludeActions?: FeeLogAction[];
    }
  ): Promise<FeeLog[]> {
    const queryBuilder = this.repo.createQueryBuilder('log');

    if (options?.excludeActions?.length) {
      queryBuilder.where('log.action NOT IN (:...excludeActions)', {
        excludeActions: options.excludeActions,
      });
    }

    queryBuilder.orderBy('log.createdAt', 'DESC');
    queryBuilder.take(options?.limit || 50);

    return await queryBuilder.getMany();
  }

  /**
   * 일별 활동 통계
   */
  async getDailyStats(
    fromDate: Date,
    toDate: Date
  ): Promise<Array<{ date: string; count: number; byAction: Record<string, number> }>> {
    const logs = await this.repo
      .createQueryBuilder('log')
      .where('log.createdAt >= :fromDate', { fromDate })
      .andWhere('log.createdAt <= :toDate', { toDate })
      .getMany();

    const dailyMap = new Map<
      string,
      { count: number; byAction: Record<string, number> }
    >();

    for (const log of logs) {
      const dateKey = log.createdAt.toISOString().split('T')[0];

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { count: 0, byAction: {} });
      }

      const daily = dailyMap.get(dateKey)!;
      daily.count++;
      daily.byAction[log.action] = (daily.byAction[log.action] || 0) + 1;
    }

    return Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 작업자별 활동 통계
   */
  async getActorStats(
    year?: number
  ): Promise<Array<{
    actorId: string;
    actorName?: string;
    actorType: string;
    count: number;
    actions: Record<string, number>;
  }>> {
    const queryBuilder = this.repo
      .createQueryBuilder('log')
      .select('log.actorId', 'actorId')
      .addSelect('log.actorName', 'actorName')
      .addSelect('log.actorType', 'actorType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.actorId')
      .addGroupBy('log.actorName')
      .addGroupBy('log.actorType');

    if (year) {
      queryBuilder.where('log.year = :year', { year });
    }

    const results = await queryBuilder.getRawMany();

    // 각 작업자별 action 통계 추가
    const statsWithActions = await Promise.all(
      results.map(async (result) => {
        const actorLogs = await this.repo.find({
          where: { actorId: result.actorId },
          select: ['action'],
        });

        const actions: Record<string, number> = {};
        for (const log of actorLogs) {
          actions[log.action] = (actions[log.action] || 0) + 1;
        }

        return {
          actorId: result.actorId,
          actorName: result.actorName,
          actorType: result.actorType,
          count: parseInt(result.count, 10),
          actions,
        };
      })
    );

    return statsWithActions;
  }

  /**
   * 로그 정리 (오래된 로그 삭제)
   */
  async cleanup(olderThanDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.repo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}
