/**
 * QuizCampaignService
 *
 * QuizCampaign CRUD 및 캠페인 관리
 * Core Quiz는 참조만 하고 재정의하지 않음
 */

import type { Repository, DataSource } from 'typeorm';
import { QuizCampaign, CampaignStatus } from '../entities/QuizCampaign.js';
import type { CampaignTargeting, CampaignReward } from '../entities/QuizCampaign.js';

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

export class QuizCampaignService {
  private repository: Repository<QuizCampaign>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(QuizCampaign);
  }

  async create(data: CreateQuizCampaignRequest): Promise<QuizCampaign> {
    const entity = this.repository.create({
      ...data,
      status: CampaignStatus.DRAFT,
      isPublished: false,
      targeting: data.targeting || { targets: ['all'] },
      rewards: data.rewards || [],
      metadata: data.metadata || {},
    });
    return this.repository.save(entity);
  }

  async findById(id: string): Promise<QuizCampaign | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findAll(filters: QuizCampaignFilters): Promise<{ items: QuizCampaign[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.repository.createQueryBuilder('qc');

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

  async findActive(): Promise<QuizCampaign[]> {
    const now = new Date();
    return this.repository
      .createQueryBuilder('qc')
      .where('qc.status = :status', { status: CampaignStatus.ACTIVE })
      .andWhere('qc.isPublished = true')
      .andWhere('(qc.startAt IS NULL OR qc.startAt <= :now)', { now })
      .andWhere('(qc.endAt IS NULL OR qc.endAt >= :now)', { now })
      .getMany();
  }

  async update(id: string, data: UpdateQuizCampaignRequest): Promise<QuizCampaign | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    Object.assign(entity, data);
    return this.repository.save(entity);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async activate(id: string): Promise<QuizCampaign | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    entity.activate();
    return this.repository.save(entity);
  }

  async pause(id: string): Promise<QuizCampaign | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    entity.pause();
    return this.repository.save(entity);
  }

  async complete(id: string): Promise<QuizCampaign | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    entity.complete();
    return this.repository.save(entity);
  }

  async archive(id: string): Promise<QuizCampaign | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    entity.archive();
    return this.repository.save(entity);
  }

  async recordParticipation(id: string): Promise<void> {
    const entity = await this.findById(id);
    if (entity) {
      entity.incrementParticipation();
      await this.repository.save(entity);
    }
  }

  async recordCompletion(id: string, score: number): Promise<void> {
    const entity = await this.findById(id);
    if (entity) {
      entity.incrementCompletion(score);
      await this.repository.save(entity);
    }
  }
}
