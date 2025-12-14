/**
 * MarketingQuizCampaignService
 *
 * Manages quiz-based marketing campaigns.
 * Supports campaign CRUD, targeting, publishing, and participation tracking.
 */

import type { DataSource, Repository } from 'typeorm';
import {
  MarketingQuizCampaign,
  type QuizQuestion,
  type QuizCampaignTargeting,
  type QuizReward,
  type CampaignStatus,
  type QuizTargetAudience,
} from '../entities/MarketingQuizCampaign.entity.js';

/**
 * DTO for creating a quiz campaign
 */
export interface CreateQuizCampaignDto {
  supplierId: string;
  title: string;
  description?: string;
  bundleId?: string;
  questions?: QuizQuestion[];
  targeting?: QuizCampaignTargeting;
  rewards?: QuizReward[];
  startDate?: Date;
  endDate?: Date;
  timeLimitSeconds?: number;
  maxAttempts?: number;
  passScorePercent?: number;
  showCorrectAnswers?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * DTO for updating a quiz campaign
 */
export interface UpdateQuizCampaignDto {
  title?: string;
  description?: string;
  bundleId?: string;
  questions?: QuizQuestion[];
  targeting?: QuizCampaignTargeting;
  rewards?: QuizReward[];
  startDate?: Date;
  endDate?: Date;
  timeLimitSeconds?: number;
  maxAttempts?: number;
  passScorePercent?: number;
  showCorrectAnswers?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * User context for targeted campaign retrieval
 */
export interface QuizUserContext {
  role: QuizTargetAudience;
  region?: string;
  sellerType?: string;
  tags?: string[];
}

/**
 * List options for querying campaigns
 */
export interface QuizCampaignListOptions {
  supplierId?: string;
  status?: CampaignStatus;
  isActive?: boolean;
  isPublished?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Quiz attempt result for recording
 */
export interface QuizAttemptResult {
  campaignId: string;
  userId: string;
  answers: Record<string, string[]>;
  score: number;
  totalPoints: number;
  passed: boolean;
  completedAt: Date;
  timeSpentSeconds?: number;
}

let quizCampaignServiceInstance: MarketingQuizCampaignService | null = null;

export class MarketingQuizCampaignService {
  private repository: Repository<MarketingQuizCampaign>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(MarketingQuizCampaign);
  }

  /**
   * Create new quiz campaign
   */
  async create(dto: CreateQuizCampaignDto): Promise<MarketingQuizCampaign> {
    const campaign = this.repository.create({
      supplierId: dto.supplierId,
      title: dto.title,
      description: dto.description || null,
      bundleId: dto.bundleId || null,
      questions: dto.questions || [],
      targeting: dto.targeting || { targets: ['all'] },
      rewards: dto.rewards || [],
      startDate: dto.startDate || null,
      endDate: dto.endDate || null,
      timeLimitSeconds: dto.timeLimitSeconds || null,
      maxAttempts: dto.maxAttempts || null,
      passScorePercent: dto.passScorePercent ?? 70,
      showCorrectAnswers: dto.showCorrectAnswers ?? true,
      shuffleQuestions: dto.shuffleQuestions ?? false,
      shuffleOptions: dto.shuffleOptions ?? false,
      metadata: dto.metadata || {},
      status: 'draft',
      isActive: true,
      isPublished: false,
    });

    return this.repository.save(campaign);
  }

  /**
   * Get campaign by ID
   */
  async getById(id: string): Promise<MarketingQuizCampaign | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Get all campaigns for a supplier
   */
  async getBySupplier(
    supplierId: string,
    options?: { status?: CampaignStatus; isActive?: boolean }
  ): Promise<MarketingQuizCampaign[]> {
    const where: Record<string, unknown> = { supplierId };

    if (options?.status) {
      where.status = options.status;
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return this.repository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get campaigns targeted for a specific user
   */
  async getForUser(userContext: QuizUserContext): Promise<MarketingQuizCampaign[]> {
    const now = new Date();

    const allCampaigns = await this.repository
      .createQueryBuilder('campaign')
      .where('campaign.isActive = :isActive', { isActive: true })
      .andWhere('campaign.isPublished = :isPublished', { isPublished: true })
      .andWhere('campaign.status = :status', { status: 'active' })
      .andWhere(
        '(campaign.startDate IS NULL OR campaign.startDate <= :now)',
        { now }
      )
      .andWhere(
        '(campaign.endDate IS NULL OR campaign.endDate >= :now)',
        { now }
      )
      .orderBy('campaign.publishedAt', 'DESC')
      .getMany();

    return allCampaigns.filter((campaign) => {
      const targeting = campaign.targeting;

      if (
        !targeting.targets.includes('all') &&
        !targeting.targets.includes(userContext.role)
      ) {
        return false;
      }

      if (
        targeting.regions &&
        targeting.regions.length > 0 &&
        userContext.region
      ) {
        if (!targeting.regions.includes(userContext.region)) {
          return false;
        }
      }

      if (
        userContext.role === 'seller' &&
        targeting.sellerTypes &&
        targeting.sellerTypes.length > 0 &&
        userContext.sellerType
      ) {
        if (!targeting.sellerTypes.includes(userContext.sellerType)) {
          return false;
        }
      }

      if (targeting.tags && targeting.tags.length > 0 && userContext.tags) {
        const hasMatchingTag = targeting.tags.some((tag) =>
          userContext.tags?.includes(tag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * List campaigns with options
   */
  async list(options?: QuizCampaignListOptions): Promise<{
    items: MarketingQuizCampaign[];
    total: number;
  }> {
    const where: Record<string, unknown> = {};

    if (options?.supplierId) {
      where.supplierId = options.supplierId;
    }
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    if (options?.isPublished !== undefined) {
      where.isPublished = options.isPublished;
    }

    const [items, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    });

    return { items, total };
  }

  /**
   * Update campaign
   */
  async update(
    id: string,
    dto: UpdateQuizCampaignDto
  ): Promise<MarketingQuizCampaign | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    if (dto.title !== undefined) existing.title = dto.title;
    if (dto.description !== undefined) existing.description = dto.description || null;
    if (dto.bundleId !== undefined) existing.bundleId = dto.bundleId || null;
    if (dto.questions !== undefined) existing.questions = dto.questions;
    if (dto.targeting !== undefined) existing.targeting = dto.targeting;
    if (dto.rewards !== undefined) existing.rewards = dto.rewards;
    if (dto.startDate !== undefined) existing.startDate = dto.startDate || null;
    if (dto.endDate !== undefined) existing.endDate = dto.endDate || null;
    if (dto.timeLimitSeconds !== undefined) existing.timeLimitSeconds = dto.timeLimitSeconds || null;
    if (dto.maxAttempts !== undefined) existing.maxAttempts = dto.maxAttempts || null;
    if (dto.passScorePercent !== undefined) existing.passScorePercent = dto.passScorePercent;
    if (dto.showCorrectAnswers !== undefined) existing.showCorrectAnswers = dto.showCorrectAnswers;
    if (dto.shuffleQuestions !== undefined) existing.shuffleQuestions = dto.shuffleQuestions;
    if (dto.shuffleOptions !== undefined) existing.shuffleOptions = dto.shuffleOptions;
    if (dto.metadata !== undefined) existing.metadata = dto.metadata;

    return this.repository.save(existing);
  }

  /**
   * Publish campaign
   */
  async publish(id: string): Promise<MarketingQuizCampaign | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    if (existing.questions.length === 0) {
      throw new Error('Cannot publish campaign without questions');
    }

    existing.isPublished = true;
    existing.publishedAt = new Date();
    existing.status = this.determineStatus(existing);

    return this.repository.save(existing);
  }

  /**
   * Unpublish campaign
   */
  async unpublish(id: string): Promise<MarketingQuizCampaign | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    existing.isPublished = false;
    existing.status = 'draft';

    return this.repository.save(existing);
  }

  /**
   * Determine campaign status based on dates and published state
   */
  private determineStatus(campaign: MarketingQuizCampaign): CampaignStatus {
    if (!campaign.isPublished) {
      return 'draft';
    }

    const now = new Date();

    if (campaign.startDate && campaign.startDate > now) {
      return 'scheduled';
    }

    if (campaign.endDate && campaign.endDate < now) {
      return 'ended';
    }

    return 'active';
  }

  /**
   * Record a quiz attempt
   */
  async recordAttempt(result: QuizAttemptResult): Promise<void> {
    const campaign = await this.getById(result.campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    campaign.participationCount += 1;
    if (result.passed) {
      campaign.completionCount += 1;
    }

    const totalAttempts = campaign.participationCount;
    const previousTotal = Number(campaign.averageScore) * (totalAttempts - 1);
    campaign.averageScore = (previousTotal + result.score) / totalAttempts;

    await this.repository.save(campaign);
  }

  /**
   * Deactivate campaign
   */
  async deactivate(id: string): Promise<MarketingQuizCampaign | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    existing.isActive = false;
    existing.isPublished = false;
    existing.status = 'archived';

    return this.repository.save(existing);
  }

  /**
   * Activate campaign
   */
  async activate(id: string): Promise<MarketingQuizCampaign | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    existing.isActive = true;
    existing.status = this.determineStatus(existing);

    return this.repository.save(existing);
  }

  /**
   * Delete campaign (soft delete via deactivation)
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.deactivate(id);
    return result !== null;
  }

  /**
   * Hard delete campaign
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Get campaign statistics
   */
  async getStatistics(id: string): Promise<{
    participationCount: number;
    completionCount: number;
    averageScore: number;
    completionRate: number;
  } | null> {
    const campaign = await this.getById(id);
    if (!campaign) {
      return null;
    }

    return {
      participationCount: campaign.participationCount,
      completionCount: campaign.completionCount,
      averageScore: Number(campaign.averageScore),
      completionRate:
        campaign.participationCount > 0
          ? (campaign.completionCount / campaign.participationCount) * 100
          : 0,
    };
  }
}

/**
 * Get MarketingQuizCampaignService singleton instance
 */
export function getMarketingQuizCampaignService(): MarketingQuizCampaignService {
  if (!quizCampaignServiceInstance) {
    throw new Error(
      'MarketingQuizCampaignService not initialized. Call initMarketingQuizCampaignService first.'
    );
  }
  return quizCampaignServiceInstance;
}

/**
 * Initialize MarketingQuizCampaignService with DataSource
 */
export function initMarketingQuizCampaignService(
  dataSource: DataSource
): MarketingQuizCampaignService {
  quizCampaignServiceInstance = new MarketingQuizCampaignService(dataSource);
  return quizCampaignServiceInstance;
}
