/**
 * SurveyCampaignService
 *
 * SurveyCampaign CRUD 및 캠페인 관리
 * Core Survey는 참조만 하고 재정의하지 않음
 */

import type { Repository, DataSource } from 'typeorm';
import { SurveyCampaign, CampaignStatus } from '../entities/SurveyCampaign.js';
import type { CampaignTargeting, CampaignReward } from '../entities/SurveyCampaign.js';

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

export class SurveyCampaignService {
  private repository: Repository<SurveyCampaign>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(SurveyCampaign);
  }

  async create(data: CreateSurveyCampaignRequest): Promise<SurveyCampaign> {
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

  async findById(id: string): Promise<SurveyCampaign | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findAll(filters: SurveyCampaignFilters): Promise<{ items: SurveyCampaign[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.repository.createQueryBuilder('sc');

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

  async findActive(): Promise<SurveyCampaign[]> {
    const now = new Date();
    return this.repository
      .createQueryBuilder('sc')
      .where('sc.status = :status', { status: CampaignStatus.ACTIVE })
      .andWhere('sc.isPublished = true')
      .andWhere('(sc.startAt IS NULL OR sc.startAt <= :now)', { now })
      .andWhere('(sc.endAt IS NULL OR sc.endAt >= :now)', { now })
      .getMany();
  }

  async update(id: string, data: UpdateSurveyCampaignRequest): Promise<SurveyCampaign | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    Object.assign(entity, data);
    return this.repository.save(entity);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async activate(id: string): Promise<SurveyCampaign | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    entity.activate();
    return this.repository.save(entity);
  }

  async pause(id: string): Promise<SurveyCampaign | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    entity.pause();
    return this.repository.save(entity);
  }

  async complete(id: string): Promise<SurveyCampaign | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    entity.complete();
    return this.repository.save(entity);
  }

  async archive(id: string): Promise<SurveyCampaign | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    entity.archive();
    return this.repository.save(entity);
  }

  async recordResponse(id: string): Promise<void> {
    const entity = await this.findById(id);
    if (entity) {
      entity.incrementResponse();
      await this.repository.save(entity);
    }
  }

  async recordCompleted(id: string): Promise<void> {
    const entity = await this.findById(id);
    if (entity) {
      entity.incrementCompleted();
      await this.repository.save(entity);
    }
  }
}
