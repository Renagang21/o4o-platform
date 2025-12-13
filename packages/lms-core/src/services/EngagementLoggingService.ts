import { DataSource, Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { EngagementLog, EngagementEventType, EngagementMetadata } from '../entities/EngagementLog.js';

/**
 * EngagementLoggingService
 *
 * 모든 콘텐츠 소비/참여 이벤트를 기록하는 공통 로깅 서비스
 * 확장앱이 Core를 수정 없이 데이터를 축적할 수 있게 해줌
 */
export class EngagementLoggingService {
  private repository: Repository<EngagementLog>;
  private initialized = false;

  constructor(private dataSource?: DataSource) {
    if (dataSource) {
      this.initRepository(dataSource);
    }
  }

  /**
   * Initialize with DataSource
   */
  initService(dataSource: DataSource): void {
    this.initRepository(dataSource);
  }

  private initRepository(dataSource: DataSource): void {
    this.repository = dataSource.getRepository(EngagementLog);
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('EngagementLoggingService not initialized. Call initService(dataSource) first.');
    }
  }

  // ============================================
  // Core Logging Methods
  // ============================================

  /**
   * Log a generic engagement event
   */
  async logEvent(
    userId: string,
    event: EngagementEventType,
    payload: {
      bundleId?: string;
      lessonId?: string;
      metadata?: EngagementMetadata;
    } = {},
  ): Promise<EngagementLog> {
    this.ensureInitialized();

    const log = this.repository.create({
      userId,
      event,
      bundleId: payload.bundleId,
      lessonId: payload.lessonId,
      metadata: payload.metadata || {},
    });

    return this.repository.save(log);
  }

  /**
   * Log a view event
   */
  async logView(
    userId: string,
    bundleId: string,
    metadata?: EngagementMetadata,
  ): Promise<EngagementLog> {
    return this.logEvent(userId, EngagementEventType.VIEW, {
      bundleId,
      metadata,
    });
  }

  /**
   * Log a click event
   */
  async logClick(
    userId: string,
    bundleId: string,
    metadata?: EngagementMetadata,
  ): Promise<EngagementLog> {
    return this.logEvent(userId, EngagementEventType.CLICK, {
      bundleId,
      metadata,
    });
  }

  /**
   * Log a reaction event
   */
  async logReaction(
    userId: string,
    bundleId: string,
    reactionType: string,
    metadata?: EngagementMetadata,
  ): Promise<EngagementLog> {
    return this.logEvent(userId, EngagementEventType.REACTION, {
      bundleId,
      metadata: {
        ...metadata,
        reactionType,
      },
    });
  }

  /**
   * Log a quiz submission event
   */
  async logQuizSubmit(
    userId: string,
    bundleId: string | undefined,
    quizId: string,
    score: number,
    passed: boolean,
    answers?: any[],
    metadata?: EngagementMetadata,
  ): Promise<EngagementLog> {
    return this.logEvent(userId, EngagementEventType.QUIZ_SUBMIT, {
      bundleId,
      metadata: {
        ...metadata,
        quizId,
        score,
        passed,
        answers,
      },
    });
  }

  /**
   * Log a survey submission event
   */
  async logSurveySubmit(
    userId: string,
    bundleId: string | undefined,
    surveyId: string,
    responseId: string,
    metadata?: EngagementMetadata,
  ): Promise<EngagementLog> {
    return this.logEvent(userId, EngagementEventType.SURVEY_SUBMIT, {
      bundleId,
      metadata: {
        ...metadata,
        surveyId,
        responseId,
      },
    });
  }

  /**
   * Log an acknowledge event (user clicked "I understand" or similar)
   */
  async logAcknowledge(
    userId: string,
    bundleId: string,
    metadata?: EngagementMetadata,
  ): Promise<EngagementLog> {
    return this.logEvent(userId, EngagementEventType.ACKNOWLEDGE, {
      bundleId,
      metadata,
    });
  }

  /**
   * Log a completion event
   */
  async logComplete(
    userId: string,
    bundleId: string,
    lessonId?: string,
    metadata?: EngagementMetadata,
  ): Promise<EngagementLog> {
    return this.logEvent(userId, EngagementEventType.COMPLETE, {
      bundleId,
      lessonId,
      metadata,
    });
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Get logs by user
   */
  async getLogsByUser(
    userId: string,
    options: {
      bundleId?: string;
      event?: EngagementEventType;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ items: EngagementLog[]; total: number }> {
    this.ensureInitialized();

    const { bundleId, event, startDate, endDate, page = 1, limit = 50 } = options;

    const qb = this.repository.createQueryBuilder('log');
    qb.where('log.userId = :userId', { userId });

    if (bundleId) {
      qb.andWhere('log.bundleId = :bundleId', { bundleId });
    }
    if (event) {
      qb.andWhere('log.event = :event', { event });
    }
    if (startDate) {
      qb.andWhere('log.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('log.createdAt <= :endDate', { endDate });
    }

    qb.orderBy('log.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * Get logs by bundle
   */
  async getLogsByBundle(
    bundleId: string,
    options: {
      event?: EngagementEventType;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ items: EngagementLog[]; total: number }> {
    this.ensureInitialized();

    const { event, startDate, endDate, page = 1, limit = 50 } = options;

    const qb = this.repository.createQueryBuilder('log');
    qb.where('log.bundleId = :bundleId', { bundleId });

    if (event) {
      qb.andWhere('log.event = :event', { event });
    }
    if (startDate) {
      qb.andWhere('log.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('log.createdAt <= :endDate', { endDate });
    }

    qb.orderBy('log.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * Get engagement statistics for a bundle
   */
  async getBundleStats(
    bundleId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<{
    totalViews: number;
    uniqueViewers: number;
    totalClicks: number;
    totalReactions: number;
    totalQuizSubmits: number;
    totalSurveySubmits: number;
    totalAcknowledges: number;
    totalCompletes: number;
    eventBreakdown: Record<string, number>;
  }> {
    this.ensureInitialized();

    const { startDate, endDate } = options;

    const qb = this.repository.createQueryBuilder('log');
    qb.where('log.bundleId = :bundleId', { bundleId });

    if (startDate) {
      qb.andWhere('log.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('log.createdAt <= :endDate', { endDate });
    }

    // Get all logs for this bundle
    const logs = await qb.getMany();

    // Calculate stats
    const eventBreakdown: Record<string, number> = {};
    const uniqueUserIds = new Set<string>();

    for (const log of logs) {
      eventBreakdown[log.event] = (eventBreakdown[log.event] || 0) + 1;
      if (log.event === EngagementEventType.VIEW) {
        uniqueUserIds.add(log.userId);
      }
    }

    return {
      totalViews: eventBreakdown[EngagementEventType.VIEW] || 0,
      uniqueViewers: uniqueUserIds.size,
      totalClicks: eventBreakdown[EngagementEventType.CLICK] || 0,
      totalReactions: eventBreakdown[EngagementEventType.REACTION] || 0,
      totalQuizSubmits: eventBreakdown[EngagementEventType.QUIZ_SUBMIT] || 0,
      totalSurveySubmits: eventBreakdown[EngagementEventType.SURVEY_SUBMIT] || 0,
      totalAcknowledges: eventBreakdown[EngagementEventType.ACKNOWLEDGE] || 0,
      totalCompletes: eventBreakdown[EngagementEventType.COMPLETE] || 0,
      eventBreakdown,
    };
  }

  /**
   * Get user engagement summary
   */
  async getUserEngagementSummary(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<{
    totalEvents: number;
    bundlesViewed: number;
    quizzesCompleted: number;
    surveysCompleted: number;
    eventBreakdown: Record<string, number>;
  }> {
    this.ensureInitialized();

    const { startDate, endDate } = options;

    const qb = this.repository.createQueryBuilder('log');
    qb.where('log.userId = :userId', { userId });

    if (startDate) {
      qb.andWhere('log.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('log.createdAt <= :endDate', { endDate });
    }

    const logs = await qb.getMany();

    const eventBreakdown: Record<string, number> = {};
    const viewedBundles = new Set<string>();

    for (const log of logs) {
      eventBreakdown[log.event] = (eventBreakdown[log.event] || 0) + 1;
      if (log.event === EngagementEventType.VIEW && log.bundleId) {
        viewedBundles.add(log.bundleId);
      }
    }

    return {
      totalEvents: logs.length,
      bundlesViewed: viewedBundles.size,
      quizzesCompleted: eventBreakdown[EngagementEventType.QUIZ_SUBMIT] || 0,
      surveysCompleted: eventBreakdown[EngagementEventType.SURVEY_SUBMIT] || 0,
      eventBreakdown,
    };
  }

  /**
   * Check if user has viewed a bundle
   */
  async hasUserViewed(userId: string, bundleId: string): Promise<boolean> {
    this.ensureInitialized();

    const count = await this.repository.count({
      where: {
        userId,
        bundleId,
        event: EngagementEventType.VIEW,
      },
    });

    return count > 0;
  }

  /**
   * Check if user has completed a bundle
   */
  async hasUserCompleted(userId: string, bundleId: string): Promise<boolean> {
    this.ensureInitialized();

    const count = await this.repository.count({
      where: {
        userId,
        bundleId,
        event: EngagementEventType.COMPLETE,
      },
    });

    return count > 0;
  }
}

// Singleton instance for service registration
let engagementLoggingServiceInstance: EngagementLoggingService | null = null;

export function getEngagementLoggingService(): EngagementLoggingService {
  if (!engagementLoggingServiceInstance) {
    engagementLoggingServiceInstance = new EngagementLoggingService();
  }
  return engagementLoggingServiceInstance;
}

export function initEngagementLoggingService(dataSource: DataSource): EngagementLoggingService {
  const service = getEngagementLoggingService();
  service.initService(dataSource);
  return service;
}
