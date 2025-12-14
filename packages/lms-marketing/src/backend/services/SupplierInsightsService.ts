/**
 * SupplierInsightsService
 *
 * Service for supplier engagement analytics and insights.
 * Aggregates data across all campaign types (product content, quiz, survey).
 *
 * Phase R9: Engagement Dashboard for Suppliers
 */

import type { DataSource, Repository } from 'typeorm';
import { ProductContent } from '../entities/ProductContent.entity.js';
import { MarketingQuizCampaign } from '../entities/MarketingQuizCampaign.entity.js';
import { SurveyCampaign } from '../entities/SurveyCampaign.entity.js';

/**
 * Campaign summary for a specific campaign type
 */
export interface CampaignTypeSummary {
  type: 'product' | 'quiz' | 'survey';
  total: number;
  active: number;
  draft: number;
  ended: number;
  totalParticipants: number;
  totalCompletions: number;
}

/**
 * Overall supplier dashboard summary
 */
export interface SupplierDashboardSummary {
  supplierId: string;
  overview: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalParticipants: number;
    totalCompletions: number;
    overallCompletionRate: number;
  };
  byType: CampaignTypeSummary[];
  recentActivity: RecentActivityItem[];
}

/**
 * Recent activity item
 */
export interface RecentActivityItem {
  id: string;
  type: 'product' | 'quiz' | 'survey';
  title: string;
  action: 'created' | 'published' | 'ended' | 'response';
  timestamp: Date;
}

/**
 * Campaign performance metrics
 */
export interface CampaignPerformance {
  id: string;
  type: 'product' | 'quiz' | 'survey';
  title: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  participationCount: number;
  completionCount: number;
  completionRate: number;
  avgScore?: number;
}

/**
 * Engagement trends data
 */
export interface EngagementTrends {
  supplierId: string;
  period: 'day' | 'week' | 'month';
  dataPoints: TrendDataPoint[];
}

/**
 * Single trend data point
 */
export interface TrendDataPoint {
  date: string;
  participants: number;
  completions: number;
  campaigns: number;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'csv';

/**
 * Export data structure
 */
export interface ExportData {
  format: ExportFormat;
  filename: string;
  data: string;
  mimeType: string;
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

/**
 * SupplierInsightsService
 */
export class SupplierInsightsService {
  private productContentRepo: Repository<ProductContent>;
  private quizCampaignRepo: Repository<MarketingQuizCampaign>;
  private surveyCampaignRepo: Repository<SurveyCampaign>;

  constructor(private dataSource: DataSource) {
    this.productContentRepo = dataSource.getRepository(ProductContent);
    this.quizCampaignRepo = dataSource.getRepository(MarketingQuizCampaign);
    this.surveyCampaignRepo = dataSource.getRepository(SurveyCampaign);
  }

  /**
   * Get dashboard summary for a supplier
   */
  async getDashboardSummary(supplierId: string): Promise<SupplierDashboardSummary> {
    const [productSummary, quizSummary, surveySummary] = await Promise.all([
      this.getProductContentSummary(supplierId),
      this.getQuizCampaignSummary(supplierId),
      this.getSurveyCampaignSummary(supplierId),
    ]);

    const totalCampaigns =
      productSummary.total + quizSummary.total + surveySummary.total;
    const activeCampaigns =
      productSummary.active + quizSummary.active + surveySummary.active;
    const totalParticipants =
      productSummary.totalParticipants +
      quizSummary.totalParticipants +
      surveySummary.totalParticipants;
    const totalCompletions =
      productSummary.totalCompletions +
      quizSummary.totalCompletions +
      surveySummary.totalCompletions;

    const overallCompletionRate =
      totalParticipants > 0
        ? Math.round((totalCompletions / totalParticipants) * 10000) / 100
        : 0;

    const recentActivity = await this.getRecentActivity(supplierId, 10);

    return {
      supplierId,
      overview: {
        totalCampaigns,
        activeCampaigns,
        totalParticipants,
        totalCompletions,
        overallCompletionRate,
      },
      byType: [productSummary, quizSummary, surveySummary],
      recentActivity,
    };
  }

  /**
   * Get product content summary for supplier
   */
  private async getProductContentSummary(
    supplierId: string
  ): Promise<CampaignTypeSummary> {
    const products = await this.productContentRepo.find({
      where: { supplierId },
    });

    const active = products.filter((p) => p.isPublished && p.isActive).length;
    const draft = products.filter((p) => !p.isPublished).length;
    const ended = products.filter((p) => !p.isActive).length;

    // Product content doesn't track participation in the same way
    const totalParticipants = 0;
    const totalCompletions = 0;

    return {
      type: 'product',
      total: products.length,
      active,
      draft,
      ended,
      totalParticipants,
      totalCompletions,
    };
  }

  /**
   * Get quiz campaign summary for supplier
   */
  private async getQuizCampaignSummary(
    supplierId: string
  ): Promise<CampaignTypeSummary> {
    const campaigns = await this.quizCampaignRepo.find({
      where: { supplierId },
    });

    const active = campaigns.filter((c) => c.status === 'active').length;
    const draft = campaigns.filter((c) => c.status === 'draft').length;
    const ended = campaigns.filter(
      (c) => c.status === 'ended' || c.status === 'archived'
    ).length;

    const totalParticipants = campaigns.reduce(
      (sum, c) => sum + c.participationCount,
      0
    );
    const totalCompletions = campaigns.reduce(
      (sum, c) => sum + c.completionCount,
      0
    );

    return {
      type: 'quiz',
      total: campaigns.length,
      active,
      draft,
      ended,
      totalParticipants,
      totalCompletions,
    };
  }

  /**
   * Get survey campaign summary for supplier
   */
  private async getSurveyCampaignSummary(
    supplierId: string
  ): Promise<CampaignTypeSummary> {
    const campaigns = await this.surveyCampaignRepo.find({
      where: { supplierId },
    });

    const active = campaigns.filter((c) => c.status === 'active').length;
    const draft = campaigns.filter((c) => c.status === 'draft').length;
    const ended = campaigns.filter(
      (c) => c.status === 'ended' || c.status === 'archived'
    ).length;

    const totalParticipants = campaigns.reduce(
      (sum, c) => sum + c.participationCount,
      0
    );
    const totalCompletions = campaigns.reduce(
      (sum, c) => sum + c.completionCount,
      0
    );

    return {
      type: 'survey',
      total: campaigns.length,
      active,
      draft,
      ended,
      totalParticipants,
      totalCompletions,
    };
  }

  /**
   * Get recent activity for a supplier
   */
  async getRecentActivity(
    supplierId: string,
    limit = 10
  ): Promise<RecentActivityItem[]> {
    const activities: RecentActivityItem[] = [];

    // Get recent product contents
    const recentProducts = await this.productContentRepo.find({
      where: { supplierId },
      order: { updatedAt: 'DESC' },
      take: limit,
    });

    for (const product of recentProducts) {
      activities.push({
        id: product.id,
        type: 'product',
        title: product.title,
        action: product.isPublished ? 'published' : 'created',
        timestamp: product.updatedAt,
      });
    }

    // Get recent quiz campaigns
    const recentQuizzes = await this.quizCampaignRepo.find({
      where: { supplierId },
      order: { updatedAt: 'DESC' },
      take: limit,
    });

    for (const quiz of recentQuizzes) {
      let action: RecentActivityItem['action'] = 'created';
      if (quiz.status === 'ended') action = 'ended';
      else if (quiz.isPublished) action = 'published';

      activities.push({
        id: quiz.id,
        type: 'quiz',
        title: quiz.title,
        action,
        timestamp: quiz.updatedAt,
      });
    }

    // Get recent survey campaigns
    const recentSurveys = await this.surveyCampaignRepo.find({
      where: { supplierId },
      order: { updatedAt: 'DESC' },
      take: limit,
    });

    for (const survey of recentSurveys) {
      let action: RecentActivityItem['action'] = 'created';
      if (survey.status === 'ended') action = 'ended';
      else if (survey.isPublished) action = 'published';

      activities.push({
        id: survey.id,
        type: 'survey',
        title: survey.title,
        action,
        timestamp: survey.updatedAt,
      });
    }

    // Sort by timestamp and limit
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return activities.slice(0, limit);
  }

  /**
   * Get campaign performance list for a supplier
   */
  async getCampaignPerformance(
    supplierId: string,
    options: {
      type?: 'product' | 'quiz' | 'survey';
      status?: string;
      dateRange?: DateRangeFilter;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ data: CampaignPerformance[]; total: number }> {
    const { type, status, dateRange, page = 1, limit = 20 } = options;
    const performances: CampaignPerformance[] = [];

    // Get quiz campaigns
    if (!type || type === 'quiz') {
      const quizQuery = this.quizCampaignRepo
        .createQueryBuilder('campaign')
        .where('campaign.supplierId = :supplierId', { supplierId });

      if (status) {
        quizQuery.andWhere('campaign.status = :status', { status });
      }

      if (dateRange?.startDate) {
        quizQuery.andWhere('campaign.createdAt >= :startDate', {
          startDate: dateRange.startDate,
        });
      }

      if (dateRange?.endDate) {
        quizQuery.andWhere('campaign.createdAt <= :endDate', {
          endDate: dateRange.endDate,
        });
      }

      const quizzes = await quizQuery.getMany();

      for (const quiz of quizzes) {
        const completionRate =
          quiz.participationCount > 0
            ? Math.round(
                (quiz.completionCount / quiz.participationCount) * 10000
              ) / 100
            : 0;

        performances.push({
          id: quiz.id,
          type: 'quiz',
          title: quiz.title,
          status: quiz.status,
          startDate: quiz.startDate,
          endDate: quiz.endDate,
          participationCount: quiz.participationCount,
          completionCount: quiz.completionCount,
          completionRate,
          avgScore: quiz.averageScore,
        });
      }
    }

    // Get survey campaigns
    if (!type || type === 'survey') {
      const surveyQuery = this.surveyCampaignRepo
        .createQueryBuilder('campaign')
        .where('campaign.supplierId = :supplierId', { supplierId });

      if (status) {
        surveyQuery.andWhere('campaign.status = :status', { status });
      }

      if (dateRange?.startDate) {
        surveyQuery.andWhere('campaign.createdAt >= :startDate', {
          startDate: dateRange.startDate,
        });
      }

      if (dateRange?.endDate) {
        surveyQuery.andWhere('campaign.createdAt <= :endDate', {
          endDate: dateRange.endDate,
        });
      }

      const surveys = await surveyQuery.getMany();

      for (const survey of surveys) {
        const completionRate =
          survey.participationCount > 0
            ? Math.round(
                (survey.completionCount / survey.participationCount) * 10000
              ) / 100
            : 0;

        performances.push({
          id: survey.id,
          type: 'survey',
          title: survey.title,
          status: survey.status,
          startDate: survey.startDate,
          endDate: survey.endDate,
          participationCount: survey.participationCount,
          completionCount: survey.completionCount,
          completionRate,
        });
      }
    }

    // Sort by participation count descending
    performances.sort((a, b) => b.participationCount - a.participationCount);

    const total = performances.length;
    const start = (page - 1) * limit;
    const paginatedData = performances.slice(start, start + limit);

    return { data: paginatedData, total };
  }

  /**
   * Get engagement trends for a supplier
   */
  async getEngagementTrends(
    supplierId: string,
    period: 'day' | 'week' | 'month' = 'week',
    dateRange?: DateRangeFilter
  ): Promise<EngagementTrends> {
    const now = new Date();
    let startDate = dateRange?.startDate;
    const endDate = dateRange?.endDate || now;

    // Default date ranges based on period
    if (!startDate) {
      startDate = new Date(now);
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 30); // Last 30 days
          break;
        case 'week':
          startDate.setDate(now.getDate() - 84); // Last 12 weeks
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 12); // Last 12 months
          break;
      }
    }

    // Get all campaigns in date range
    const [quizzes, surveys] = await Promise.all([
      this.quizCampaignRepo
        .createQueryBuilder('campaign')
        .where('campaign.supplierId = :supplierId', { supplierId })
        .andWhere('campaign.createdAt >= :startDate', { startDate })
        .andWhere('campaign.createdAt <= :endDate', { endDate })
        .getMany(),
      this.surveyCampaignRepo
        .createQueryBuilder('campaign')
        .where('campaign.supplierId = :supplierId', { supplierId })
        .andWhere('campaign.createdAt >= :startDate', { startDate })
        .andWhere('campaign.createdAt <= :endDate', { endDate })
        .getMany(),
    ]);

    // Group by period
    const dataPointsMap = new Map<
      string,
      { participants: number; completions: number; campaigns: number }
    >();

    const formatDate = (date: Date): string => {
      switch (period) {
        case 'day':
          return date.toISOString().split('T')[0];
        case 'week': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          return weekStart.toISOString().split('T')[0];
        }
        case 'month':
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
    };

    // Aggregate quiz data
    for (const quiz of quizzes) {
      const key = formatDate(quiz.createdAt);
      const existing = dataPointsMap.get(key) || {
        participants: 0,
        completions: 0,
        campaigns: 0,
      };
      existing.participants += quiz.participationCount;
      existing.completions += quiz.completionCount;
      existing.campaigns += 1;
      dataPointsMap.set(key, existing);
    }

    // Aggregate survey data
    for (const survey of surveys) {
      const key = formatDate(survey.createdAt);
      const existing = dataPointsMap.get(key) || {
        participants: 0,
        completions: 0,
        campaigns: 0,
      };
      existing.participants += survey.participationCount;
      existing.completions += survey.completionCount;
      existing.campaigns += 1;
      dataPointsMap.set(key, existing);
    }

    // Convert to array and sort
    const dataPoints: TrendDataPoint[] = Array.from(dataPointsMap.entries())
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      supplierId,
      period,
      dataPoints,
    };
  }

  /**
   * Get detailed campaign analytics
   */
  async getCampaignAnalytics(
    campaignId: string,
    type: 'quiz' | 'survey'
  ): Promise<Record<string, unknown> | null> {
    if (type === 'quiz') {
      const campaign = await this.quizCampaignRepo.findOne({
        where: { id: campaignId },
      });

      if (!campaign) return null;

      const completionRate =
        campaign.participationCount > 0
          ? Math.round(
              (campaign.completionCount / campaign.participationCount) * 10000
            ) / 100
          : 0;

      return {
        id: campaign.id,
        type: 'quiz',
        title: campaign.title,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        metrics: {
          participationCount: campaign.participationCount,
          completionCount: campaign.completionCount,
          completionRate,
          averageScore: campaign.averageScore,
          passScorePercent: campaign.passScorePercent,
        },
        questions: campaign.questions.map((q, idx) => ({
          index: idx + 1,
          question: q.question,
          type: q.type,
          // Would include answer distribution from actual response data
        })),
        targeting: campaign.targeting,
        rewards: campaign.rewards,
      };
    }

    if (type === 'survey') {
      const campaign = await this.surveyCampaignRepo.findOne({
        where: { id: campaignId },
      });

      if (!campaign) return null;

      const completionRate =
        campaign.participationCount > 0
          ? Math.round(
              (campaign.completionCount / campaign.participationCount) * 10000
            ) / 100
          : 0;

      return {
        id: campaign.id,
        type: 'survey',
        title: campaign.title,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        metrics: {
          participationCount: campaign.participationCount,
          completionCount: campaign.completionCount,
          completionRate,
          allowAnonymous: campaign.allowAnonymous,
          maxResponses: campaign.maxResponses,
        },
        questions: campaign.questions.map((q, idx) => ({
          index: idx + 1,
          question: q.question,
          type: q.type,
          required: q.required,
          // Would include answer distribution from actual response data
        })),
        targeting: campaign.targeting,
        reward: campaign.reward,
      };
    }

    return null;
  }

  /**
   * Export campaign data
   */
  async exportCampaignData(
    supplierId: string,
    options: {
      format: ExportFormat;
      type?: 'product' | 'quiz' | 'survey';
      dateRange?: DateRangeFilter;
    }
  ): Promise<ExportData> {
    const { format, type, dateRange } = options;

    // Get performance data
    const { data } = await this.getCampaignPerformance(supplierId, {
      type,
      dateRange,
      limit: 1000, // Export all
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `campaign-report-${supplierId}-${timestamp}`;

    if (format === 'json') {
      return {
        format: 'json',
        filename: `${filename}.json`,
        data: JSON.stringify(data, null, 2),
        mimeType: 'application/json',
      };
    }

    // CSV format
    const headers = [
      'ID',
      'Type',
      'Title',
      'Status',
      'Start Date',
      'End Date',
      'Participants',
      'Completions',
      'Completion Rate',
      'Avg Score',
    ];

    const rows = data.map((item) => [
      item.id,
      item.type,
      `"${item.title.replace(/"/g, '""')}"`,
      item.status,
      item.startDate?.toISOString() || '',
      item.endDate?.toISOString() || '',
      item.participationCount.toString(),
      item.completionCount.toString(),
      `${item.completionRate}%`,
      item.avgScore?.toString() || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );

    return {
      format: 'csv',
      filename: `${filename}.csv`,
      data: csvContent,
      mimeType: 'text/csv',
    };
  }

  /**
   * Get top performing campaigns for a supplier
   */
  async getTopCampaigns(
    supplierId: string,
    limit = 5
  ): Promise<CampaignPerformance[]> {
    const { data } = await this.getCampaignPerformance(supplierId, {
      limit,
    });
    return data;
  }
}

// Singleton instance
let supplierInsightsServiceInstance: SupplierInsightsService | null = null;

/**
 * Get the SupplierInsightsService singleton instance
 */
export function getSupplierInsightsService(): SupplierInsightsService {
  if (!supplierInsightsServiceInstance) {
    throw new Error(
      'SupplierInsightsService not initialized. Call initSupplierInsightsService first.'
    );
  }
  return supplierInsightsServiceInstance;
}

/**
 * Initialize the SupplierInsightsService with a DataSource
 */
export function initSupplierInsightsService(
  dataSource: DataSource
): SupplierInsightsService {
  if (!supplierInsightsServiceInstance) {
    supplierInsightsServiceInstance = new SupplierInsightsService(dataSource);
  }
  return supplierInsightsServiceInstance;
}
