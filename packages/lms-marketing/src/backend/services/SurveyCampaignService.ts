/**
 * SurveyCampaignService
 *
 * Service for managing marketing survey campaigns.
 * Handles campaign CRUD, publishing, response recording, and statistics.
 *
 * Phase R8: Survey Campaign Module
 */

import type { DataSource, Repository } from 'typeorm';
import {
  SurveyCampaign,
  type SurveyCampaignTargeting,
  type SurveyReward,
  type SurveyQuestion,
  type SurveyAnswer,
  type SurveyCampaignStatus,
} from '../entities/SurveyCampaign.entity.js';

/**
 * DTO for creating a survey campaign
 */
export interface CreateSurveyCampaignDto {
  supplierId: string;
  surveyId?: string;
  title: string;
  description?: string;
  bundleId?: string;
  questions?: SurveyQuestion[];
  targeting?: SurveyCampaignTargeting;
  reward?: SurveyReward;
  startDate?: Date;
  endDate?: Date;
  allowAnonymous?: boolean;
  maxResponses?: number;
  metadata?: Record<string, unknown>;
}

/**
 * DTO for updating a survey campaign
 */
export interface UpdateSurveyCampaignDto {
  title?: string;
  description?: string;
  surveyId?: string;
  bundleId?: string;
  questions?: SurveyQuestion[];
  targeting?: SurveyCampaignTargeting;
  reward?: SurveyReward;
  startDate?: Date;
  endDate?: Date;
  allowAnonymous?: boolean;
  maxResponses?: number;
  metadata?: Record<string, unknown>;
}

/**
 * DTO for submitting survey response
 */
export interface SubmitSurveyResponseDto {
  userId?: string;
  isAnonymous?: boolean;
  answers: SurveyAnswer[];
  metadata?: Record<string, unknown>;
}

/**
 * Survey campaign list options
 */
export interface SurveyCampaignListOptions {
  supplierId?: string;
  status?: SurveyCampaignStatus;
  isPublished?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/**
 * User filter for getting campaigns
 */
export interface UserCampaignFilter {
  role: 'seller' | 'consumer' | 'pharmacist' | 'all';
  region?: string;
  sellerType?: string;
  tags?: string[];
}

/**
 * Campaign statistics
 */
export interface SurveyCampaignStatistics {
  campaignId: string;
  title: string;
  totalParticipants: number;
  completionCount: number;
  completionRate: number;
  questionStats: Array<{
    questionId: string;
    question: string;
    type: string;
    responseCount: number;
    answers: Record<string, number>;
  }>;
}

/**
 * SurveyCampaignService
 */
export class SurveyCampaignService {
  private repository: Repository<SurveyCampaign>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(SurveyCampaign);
  }

  /**
   * Create a new survey campaign
   */
  async create(dto: CreateSurveyCampaignDto): Promise<SurveyCampaign> {
    const campaign = this.repository.create({
      supplierId: dto.supplierId,
      surveyId: dto.surveyId || null,
      title: dto.title,
      description: dto.description || null,
      bundleId: dto.bundleId || null,
      questions: dto.questions || [],
      targeting: dto.targeting || { targets: ['all'] },
      reward: dto.reward || null,
      startDate: dto.startDate || null,
      endDate: dto.endDate || null,
      allowAnonymous: dto.allowAnonymous ?? false,
      maxResponses: dto.maxResponses || null,
      status: 'draft',
      isActive: true,
      isPublished: false,
      metadata: dto.metadata || {},
    });

    return this.repository.save(campaign);
  }

  /**
   * Get a survey campaign by ID
   */
  async findById(id: string): Promise<SurveyCampaign | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Get all survey campaigns with optional filters
   */
  async findAll(options: SurveyCampaignListOptions = {}): Promise<{
    data: SurveyCampaign[];
    total: number;
  }> {
    const {
      supplierId,
      status,
      isPublished,
      isActive,
      page = 1,
      limit = 20,
    } = options;

    const queryBuilder = this.repository.createQueryBuilder('campaign');

    if (supplierId) {
      queryBuilder.andWhere('campaign.supplierId = :supplierId', { supplierId });
    }

    if (status) {
      queryBuilder.andWhere('campaign.status = :status', { status });
    }

    if (isPublished !== undefined) {
      queryBuilder.andWhere('campaign.isPublished = :isPublished', { isPublished });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('campaign.isActive = :isActive', { isActive });
    }

    queryBuilder.orderBy('campaign.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  /**
   * Get campaigns for a specific supplier
   */
  async findBySupplier(
    supplierId: string,
    options: { status?: SurveyCampaignStatus; page?: number; limit?: number } = {}
  ): Promise<{ data: SurveyCampaign[]; total: number }> {
    return this.findAll({ ...options, supplierId });
  }

  /**
   * Get active campaigns for a user based on targeting
   */
  async getForUser(filter: UserCampaignFilter): Promise<SurveyCampaign[]> {
    const now = new Date();

    const queryBuilder = this.repository
      .createQueryBuilder('campaign')
      .where('campaign.isPublished = :isPublished', { isPublished: true })
      .andWhere('campaign.isActive = :isActive', { isActive: true })
      .andWhere('campaign.status = :status', { status: 'active' })
      .andWhere(
        '(campaign.startDate IS NULL OR campaign.startDate <= :now)',
        { now }
      )
      .andWhere(
        '(campaign.endDate IS NULL OR campaign.endDate >= :now)',
        { now }
      )
      .andWhere(
        '(campaign.maxResponses IS NULL OR campaign.participationCount < campaign.maxResponses)'
      );

    const campaigns = await queryBuilder.getMany();

    // Filter by targeting
    return campaigns.filter((campaign) => {
      const targeting = campaign.targeting;

      // Check role targeting
      if (
        !targeting.targets.includes('all') &&
        !targeting.targets.includes(filter.role as any)
      ) {
        return false;
      }

      // Check region targeting
      if (
        targeting.regions &&
        targeting.regions.length > 0 &&
        filter.region &&
        !targeting.regions.includes(filter.region)
      ) {
        return false;
      }

      // Check seller type targeting
      if (
        targeting.sellerTypes &&
        targeting.sellerTypes.length > 0 &&
        filter.sellerType &&
        !targeting.sellerTypes.includes(filter.sellerType)
      ) {
        return false;
      }

      // Check tag targeting
      if (
        targeting.tags &&
        targeting.tags.length > 0 &&
        filter.tags &&
        filter.tags.length > 0
      ) {
        const hasMatchingTag = targeting.tags.some((tag) =>
          filter.tags!.includes(tag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Update a survey campaign
   */
  async update(
    id: string,
    dto: UpdateSurveyCampaignDto
  ): Promise<SurveyCampaign | null> {
    const campaign = await this.findById(id);
    if (!campaign) {
      return null;
    }

    // Don't allow updates to published campaigns (except unpublishing)
    if (campaign.isPublished && campaign.status === 'active') {
      throw new Error('Cannot update an active published campaign');
    }

    Object.assign(campaign, {
      ...dto,
      updatedAt: new Date(),
    });

    return this.repository.save(campaign);
  }

  /**
   * Publish a survey campaign
   */
  async publish(id: string): Promise<SurveyCampaign | null> {
    const campaign = await this.findById(id);
    if (!campaign) {
      return null;
    }

    // Validate campaign has questions
    if (
      (!campaign.questions || campaign.questions.length === 0) &&
      !campaign.surveyId
    ) {
      throw new Error('Campaign must have questions or reference a survey');
    }

    const now = new Date();
    let status: SurveyCampaignStatus = 'active';

    // Check if campaign should be scheduled
    if (campaign.startDate && campaign.startDate > now) {
      status = 'scheduled';
    }

    // Check if campaign has already ended
    if (campaign.endDate && campaign.endDate < now) {
      status = 'ended';
    }

    campaign.isPublished = true;
    campaign.status = status;
    campaign.publishedAt = now;

    return this.repository.save(campaign);
  }

  /**
   * Unpublish a survey campaign
   */
  async unpublish(id: string): Promise<SurveyCampaign | null> {
    const campaign = await this.findById(id);
    if (!campaign) {
      return null;
    }

    campaign.isPublished = false;
    campaign.status = 'draft';

    return this.repository.save(campaign);
  }

  /**
   * End a survey campaign
   */
  async end(id: string): Promise<SurveyCampaign | null> {
    const campaign = await this.findById(id);
    if (!campaign) {
      return null;
    }

    campaign.status = 'ended';
    campaign.endDate = new Date();

    return this.repository.save(campaign);
  }

  /**
   * Record a survey response
   */
  async recordResponse(
    id: string,
    dto: SubmitSurveyResponseDto
  ): Promise<{ success: boolean; message: string }> {
    const campaign = await this.findById(id);
    if (!campaign) {
      return { success: false, message: 'Campaign not found' };
    }

    if (!campaign.isPublished || campaign.status !== 'active') {
      return { success: false, message: 'Campaign is not active' };
    }

    // Check max responses
    if (
      campaign.maxResponses &&
      campaign.participationCount >= campaign.maxResponses
    ) {
      return { success: false, message: 'Campaign has reached maximum responses' };
    }

    // Check anonymous permission
    if (dto.isAnonymous && !campaign.allowAnonymous) {
      return { success: false, message: 'Campaign does not allow anonymous responses' };
    }

    // Update participation count
    campaign.participationCount += 1;
    campaign.completionCount += 1;

    await this.repository.save(campaign);

    // TODO: Store response in a separate table or via lms-core SurveyResponse
    // TODO: Log engagement via EngagementLoggingService

    return {
      success: true,
      message: 'Survey response recorded successfully',
    };
  }

  /**
   * Get campaign statistics
   */
  async getStatistics(id: string): Promise<SurveyCampaignStatistics | null> {
    const campaign = await this.findById(id);
    if (!campaign) {
      return null;
    }

    const completionRate =
      campaign.participationCount > 0
        ? (campaign.completionCount / campaign.participationCount) * 100
        : 0;

    // TODO: Implement detailed question statistics from response data
    const questionStats = campaign.questions.map((q) => ({
      questionId: q.id,
      question: q.question,
      type: q.type,
      responseCount: campaign.completionCount,
      answers: {}, // Would be populated from actual response data
    }));

    return {
      campaignId: campaign.id,
      title: campaign.title,
      totalParticipants: campaign.participationCount,
      completionCount: campaign.completionCount,
      completionRate: Math.round(completionRate * 100) / 100,
      questionStats,
    };
  }

  /**
   * Delete a survey campaign (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    const campaign = await this.findById(id);
    if (!campaign) {
      return false;
    }

    campaign.isActive = false;
    campaign.status = 'archived';
    await this.repository.save(campaign);

    return true;
  }

  /**
   * Hard delete a survey campaign
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}

// Singleton instance
let surveyCampaignServiceInstance: SurveyCampaignService | null = null;

/**
 * Get the SurveyCampaignService singleton instance
 */
export function getSurveyCampaignService(): SurveyCampaignService {
  if (!surveyCampaignServiceInstance) {
    throw new Error(
      'SurveyCampaignService not initialized. Call initSurveyCampaignService first.'
    );
  }
  return surveyCampaignServiceInstance;
}

/**
 * Initialize the SurveyCampaignService with a DataSource
 */
export function initSurveyCampaignService(
  dataSource: DataSource
): SurveyCampaignService {
  if (!surveyCampaignServiceInstance) {
    surveyCampaignServiceInstance = new SurveyCampaignService(dataSource);
  }
  return surveyCampaignServiceInstance;
}
