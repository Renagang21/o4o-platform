import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { SurveyCampaign, CampaignStatus } from '@o4o/lms-marketing';
import type { CampaignTargeting, CampaignReward } from '@o4o/lms-marketing';
import logger from '../../../utils/logger.js';

/**
 * SurveyCampaignService
 * LMS Module - SurveyCampaign Management (Phase 2 Refoundation)
 *
 * Campaign wrapper for Core Survey execution
 * Core ID reference pattern - NOT entity duplication
 */

export interface CreateSurveyCampaignRequest {
  supplierId: string;
  surveyId: string;
  bundleId?: string;
  title: string;
  description?: string;
  startAt?: Date;
  endAt?: Date;
  targeting?: CampaignTargeting;
  rewards?: CampaignReward[];
  maxResponses?: number;
  metadata?: Record<string, any>;
}

export interface UpdateSurveyCampaignRequest {
  title?: string;
  description?: string;
  bundleId?: string;
  startAt?: Date;
  endAt?: Date;
  targeting?: CampaignTargeting;
  rewards?: CampaignReward[];
  maxResponses?: number;
  metadata?: Record<string, any>;
}

export interface SurveyCampaignFilters {
  supplierId?: string;
  surveyId?: string;
  status?: CampaignStatus;
  isPublished?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export class SurveyCampaignService extends BaseService<SurveyCampaign> {
  private static instance: SurveyCampaignService;
  private campaignRepository: Repository<SurveyCampaign>;

  constructor() {
    const repository = AppDataSource.getRepository(SurveyCampaign);
    super(repository);
    this.campaignRepository = repository;
  }

  static getInstance(): SurveyCampaignService {
    if (!SurveyCampaignService.instance) {
      SurveyCampaignService.instance = new SurveyCampaignService();
    }
    return SurveyCampaignService.instance;
  }

  // ============================================
  // CRUD
  // ============================================

  async createCampaign(data: CreateSurveyCampaignRequest): Promise<SurveyCampaign> {
    const entity = this.campaignRepository.create({
      ...data,
      status: CampaignStatus.DRAFT,
      isPublished: false,
      targeting: data.targeting || { targets: ['all'] },
      rewards: data.rewards || [],
      metadata: data.metadata || {},
    });
    return this.campaignRepository.save(entity);
  }

  async getCampaign(id: string): Promise<SurveyCampaign | null> {
    return this.campaignRepository.findOne({ where: { id } });
  }

  async listCampaigns(filters: SurveyCampaignFilters): Promise<{ items: SurveyCampaign[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.campaignRepository.createQueryBuilder('sc');

    if (filters.supplierId) {
      qb.andWhere('sc.supplierId = :supplierId', { supplierId: filters.supplierId });
    }
    if (filters.surveyId) {
      qb.andWhere('sc.surveyId = :surveyId', { surveyId: filters.surveyId });
    }
    if (filters.status) {
      qb.andWhere('sc.status = :status', { status: filters.status });
    }
    if (filters.isPublished !== undefined) {
      qb.andWhere('sc.isPublished = :isPublished', { isPublished: filters.isPublished });
    }
    if (filters.search) {
      qb.andWhere('sc.title ILIKE :search', { search: `%${filters.search}%` });
    }

    qb.orderBy('sc.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async updateCampaign(id: string, data: UpdateSurveyCampaignRequest): Promise<SurveyCampaign | null> {
    const entity = await this.getCampaign(id);
    if (!entity) return null;

    Object.assign(entity, data);
    return this.campaignRepository.save(entity);
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const result = await this.campaignRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // ============================================
  // Campaign Status
  // ============================================

  async activateCampaign(id: string): Promise<SurveyCampaign | null> {
    const entity = await this.getCampaign(id);
    if (!entity) return null;

    entity.activate();
    return this.campaignRepository.save(entity);
  }

  async pauseCampaign(id: string): Promise<SurveyCampaign | null> {
    const entity = await this.getCampaign(id);
    if (!entity) return null;

    entity.pause();
    return this.campaignRepository.save(entity);
  }

  async completeCampaign(id: string): Promise<SurveyCampaign | null> {
    const entity = await this.getCampaign(id);
    if (!entity) return null;

    entity.complete();
    return this.campaignRepository.save(entity);
  }

  async archiveCampaign(id: string): Promise<SurveyCampaign | null> {
    const entity = await this.getCampaign(id);
    if (!entity) return null;

    entity.archive();
    return this.campaignRepository.save(entity);
  }

  // ============================================
  // Queries
  // ============================================

  async findActiveCampaigns(): Promise<SurveyCampaign[]> {
    const now = new Date();
    return this.campaignRepository
      .createQueryBuilder('sc')
      .where('sc.status = :status', { status: CampaignStatus.ACTIVE })
      .andWhere('sc.isPublished = true')
      .andWhere('(sc.startAt IS NULL OR sc.startAt <= :now)', { now })
      .andWhere('(sc.endAt IS NULL OR sc.endAt >= :now)', { now })
      .getMany();
  }

  // ============================================
  // Statistics Recording (from Core Survey events)
  // ============================================

  async recordResponse(id: string): Promise<void> {
    const entity = await this.getCampaign(id);
    if (entity) {
      entity.incrementResponse();
      await this.campaignRepository.save(entity);
    }
  }

  async recordCompleted(id: string): Promise<void> {
    const entity = await this.getCampaign(id);
    if (entity) {
      entity.incrementCompleted();
      await this.campaignRepository.save(entity);
    }
  }
}
