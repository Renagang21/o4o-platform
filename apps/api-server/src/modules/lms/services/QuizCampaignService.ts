import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { QuizCampaign, CampaignStatus } from '@o4o/lms-marketing';
import type { CampaignTargeting, CampaignReward } from '@o4o/lms-marketing';
import logger from '../../../utils/logger.js';

/**
 * QuizCampaignService
 * LMS Module - QuizCampaign Management (Phase 2 Refoundation)
 *
 * Campaign wrapper for Core Quiz execution
 * Core ID reference pattern - NOT entity duplication
 */

export interface CreateQuizCampaignRequest {
  supplierId: string;
  quizId: string;
  bundleId?: string;
  title: string;
  description?: string;
  startAt?: Date;
  endAt?: Date;
  targeting?: CampaignTargeting;
  rewards?: CampaignReward[];
  maxParticipants?: number;
  metadata?: Record<string, any>;
}

export interface UpdateQuizCampaignRequest {
  title?: string;
  description?: string;
  bundleId?: string;
  startAt?: Date;
  endAt?: Date;
  targeting?: CampaignTargeting;
  rewards?: CampaignReward[];
  maxParticipants?: number;
  metadata?: Record<string, any>;
}

export interface QuizCampaignFilters {
  supplierId?: string;
  quizId?: string;
  status?: CampaignStatus;
  isPublished?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export class QuizCampaignService extends BaseService<QuizCampaign> {
  private static instance: QuizCampaignService;
  private campaignRepository: Repository<QuizCampaign>;

  constructor() {
    const repository = AppDataSource.getRepository(QuizCampaign);
    super(repository);
    this.campaignRepository = repository;
  }

  static getInstance(): QuizCampaignService {
    if (!QuizCampaignService.instance) {
      QuizCampaignService.instance = new QuizCampaignService();
    }
    return QuizCampaignService.instance;
  }

  // ============================================
  // CRUD
  // ============================================

  async createCampaign(data: CreateQuizCampaignRequest): Promise<QuizCampaign> {
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

  async getCampaign(id: string): Promise<QuizCampaign | null> {
    return this.campaignRepository.findOne({ where: { id } });
  }

  async listCampaigns(filters: QuizCampaignFilters): Promise<{ items: QuizCampaign[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.campaignRepository.createQueryBuilder('qc');

    if (filters.supplierId) {
      qb.andWhere('qc.supplierId = :supplierId', { supplierId: filters.supplierId });
    }
    if (filters.quizId) {
      qb.andWhere('qc.quizId = :quizId', { quizId: filters.quizId });
    }
    if (filters.status) {
      qb.andWhere('qc.status = :status', { status: filters.status });
    }
    if (filters.isPublished !== undefined) {
      qb.andWhere('qc.isPublished = :isPublished', { isPublished: filters.isPublished });
    }
    if (filters.search) {
      qb.andWhere('qc.title ILIKE :search', { search: `%${filters.search}%` });
    }

    qb.orderBy('qc.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async updateCampaign(id: string, data: UpdateQuizCampaignRequest): Promise<QuizCampaign | null> {
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

  async activateCampaign(id: string): Promise<QuizCampaign | null> {
    const entity = await this.getCampaign(id);
    if (!entity) return null;

    entity.activate();
    return this.campaignRepository.save(entity);
  }

  async pauseCampaign(id: string): Promise<QuizCampaign | null> {
    const entity = await this.getCampaign(id);
    if (!entity) return null;

    entity.pause();
    return this.campaignRepository.save(entity);
  }

  async completeCampaign(id: string): Promise<QuizCampaign | null> {
    const entity = await this.getCampaign(id);
    if (!entity) return null;

    entity.complete();
    return this.campaignRepository.save(entity);
  }

  async archiveCampaign(id: string): Promise<QuizCampaign | null> {
    const entity = await this.getCampaign(id);
    if (!entity) return null;

    entity.archive();
    return this.campaignRepository.save(entity);
  }

  // ============================================
  // Queries
  // ============================================

  async findActiveCampaigns(): Promise<QuizCampaign[]> {
    const now = new Date();
    return this.campaignRepository
      .createQueryBuilder('qc')
      .where('qc.status = :status', { status: CampaignStatus.ACTIVE })
      .andWhere('qc.isPublished = true')
      .andWhere('(qc.startAt IS NULL OR qc.startAt <= :now)', { now })
      .andWhere('(qc.endAt IS NULL OR qc.endAt >= :now)', { now })
      .getMany();
  }

  // ============================================
  // Statistics Recording (from Core Quiz events)
  // ============================================

  async recordParticipation(id: string): Promise<void> {
    const entity = await this.getCampaign(id);
    if (entity) {
      entity.incrementParticipation();
      await this.campaignRepository.save(entity);
    }
  }

  async recordCompletion(id: string, score: number): Promise<void> {
    const entity = await this.getCampaign(id);
    if (entity) {
      entity.incrementCompletion(score);
      await this.campaignRepository.save(entity);
    }
  }
}
