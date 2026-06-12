import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import {
  ContentAnalytics,
  ContentAnalyticsEventType,
  StoreContent,
} from '@o4o/interactive-content-core/entities';
import logger from '../../../utils/logger.js';

/**
 * ContentAnalyticsService
 * LMS Module - Content Analytics (WO-O4O-CONTENT-ANALYTICS)
 *
 * 콘텐츠 이벤트 수집 & 통계 조회
 * 패턴: fire-and-forget INSERT, GROUP BY 통계
 */

export interface ContentStats {
  views: number;
  qrScans: number;
  quizSubmits: number;
  surveySubmits: number;
  shares: number;
  total: number;
}

export interface StoreStats {
  totalContents: number;
  totalViews: number;
  totalEngagements: number;
  topContents: { id: string; title: string; views: number; engagements: number }[];
}

export class ContentAnalyticsService extends BaseService<ContentAnalytics> {
  private static instance: ContentAnalyticsService;
  private analyticsRepository: Repository<ContentAnalytics>;
  private storeContentRepository: Repository<StoreContent>;

  constructor() {
    const analyticsRepository = AppDataSource.getRepository(ContentAnalytics);
    super(analyticsRepository);
    this.analyticsRepository = analyticsRepository;
    this.storeContentRepository = AppDataSource.getRepository(StoreContent);
  }

  static getInstance(): ContentAnalyticsService {
    if (!ContentAnalyticsService.instance) {
      ContentAnalyticsService.instance = new ContentAnalyticsService();
    }
    return ContentAnalyticsService.instance;
  }

  /**
   * Track an analytics event (fire-and-forget)
   */
  async trackEvent(
    storeContentId: string,
    eventType: ContentAnalyticsEventType,
    visitorId?: string | null,
    metadata?: Record<string, any>,
  ): Promise<ContentAnalytics> {
    const event = this.analyticsRepository.create({
      storeContentId,
      eventType,
      visitorId: visitorId || undefined,
      metadata: metadata || {},
    });

    const saved = await this.analyticsRepository.save(event);
    logger.debug('[ContentAnalyticsService.trackEvent]', {
      storeContentId,
      eventType,
      id: saved.id,
    });
    return saved;
  }

  /**
   * Get stats for a single content item
   */
  async getContentStats(storeContentId: string): Promise<ContentStats> {
    const rows = await this.analyticsRepository
      .createQueryBuilder('ca')
      .select('ca.event_type', 'eventType')
      .addSelect('COUNT(*)::int', 'count')
      .where('ca.store_content_id = :storeContentId', { storeContentId })
      .groupBy('ca.event_type')
      .getRawMany<{ eventType: string; count: number }>();

    const stats: ContentStats = {
      views: 0,
      qrScans: 0,
      quizSubmits: 0,
      surveySubmits: 0,
      shares: 0,
      total: 0,
    };

    for (const row of rows) {
      const cnt = Number(row.count) || 0;
      stats.total += cnt;
      switch (row.eventType) {
        case ContentAnalyticsEventType.VIEW:
          stats.views = cnt;
          break;
        case ContentAnalyticsEventType.QR_SCAN:
          stats.qrScans = cnt;
          break;
        case ContentAnalyticsEventType.QUIZ_SUBMIT:
          stats.quizSubmits = cnt;
          break;
        case ContentAnalyticsEventType.SURVEY_SUBMIT:
          stats.surveySubmits = cnt;
          break;
        case ContentAnalyticsEventType.SHARE:
          stats.shares = cnt;
          break;
      }
    }

    return stats;
  }

  /**
   * Get aggregate stats for a store
   */
  async getStoreStats(storeId: string): Promise<StoreStats> {
    // 1. Total contents for this store
    const totalContents = await this.storeContentRepository.count({
      where: { storeId },
    });

    // 2. Total views & engagements via raw query
    const aggRows = await this.analyticsRepository
      .createQueryBuilder('ca')
      .innerJoin('store_contents', 'sc', 'sc.id = ca.store_content_id')
      .select('ca.event_type', 'eventType')
      .addSelect('COUNT(*)::int', 'count')
      .where('sc.store_id = :storeId', { storeId })
      .groupBy('ca.event_type')
      .getRawMany<{ eventType: string; count: number }>();

    let totalViews = 0;
    let totalEngagements = 0;
    for (const row of aggRows) {
      const cnt = Number(row.count) || 0;
      if (row.eventType === ContentAnalyticsEventType.VIEW) {
        totalViews = cnt;
      } else {
        totalEngagements += cnt;
      }
    }

    // 3. Top 5 contents by views
    const topRows = await this.analyticsRepository
      .createQueryBuilder('ca')
      .innerJoin('store_contents', 'sc', 'sc.id = ca.store_content_id')
      .select('sc.id', 'id')
      .addSelect('sc.title', 'title')
      .addSelect('COUNT(*) FILTER (WHERE ca.event_type = :viewType)::int', 'views')
      .addSelect('COUNT(*) FILTER (WHERE ca.event_type != :viewType)::int', 'engagements')
      .where('sc.store_id = :storeId', { storeId })
      .setParameter('viewType', ContentAnalyticsEventType.VIEW)
      .groupBy('sc.id')
      .addGroupBy('sc.title')
      .orderBy('views', 'DESC')
      .limit(5)
      .getRawMany<{ id: string; title: string; views: number; engagements: number }>();

    return {
      totalContents,
      totalViews,
      totalEngagements,
      topContents: topRows.map(r => ({
        id: r.id,
        title: r.title,
        views: Number(r.views) || 0,
        engagements: Number(r.engagements) || 0,
      })),
    };
  }
}
