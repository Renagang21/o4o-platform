/**
 * PartnerRoutineService
 *
 * 파트너 루틴 추천 관리 서비스
 */

import type { Repository } from 'typeorm';
import { PartnerRoutine, RoutineType, RoutineStep } from '../entities/partner-routine.entity.js';

export interface CreatePartnerRoutineDto {
  partnerId: string;
  title: string;
  routineType: RoutineType;
  description?: string;
  steps: RoutineStep[];
  skinTypes?: string[];
  skinConcerns?: string[];
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePartnerRoutineDto {
  title?: string;
  routineType?: RoutineType;
  description?: string;
  steps?: RoutineStep[];
  skinTypes?: string[];
  skinConcerns?: string[];
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface RoutineFilter {
  partnerId?: string;
  routineType?: RoutineType;
  isPublished?: boolean;
  skinType?: string;
  skinConcern?: string;
}

export class PartnerRoutineService {
  constructor(private readonly routineRepository: Repository<PartnerRoutine>) {}

  async createRoutine(dto: CreatePartnerRoutineDto): Promise<PartnerRoutine> {
    const routine = this.routineRepository.create({
      ...dto,
      viewCount: 0,
      likeCount: 0,
      isPublished: false,
    });

    return this.routineRepository.save(routine);
  }

  async findById(id: string): Promise<PartnerRoutine | null> {
    return this.routineRepository.findOne({ where: { id } });
  }

  async findByPartnerId(partnerId: string): Promise<PartnerRoutine[]> {
    return this.routineRepository.find({
      where: { partnerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findPublicRoutines(filter?: RoutineFilter): Promise<PartnerRoutine[]> {
    const query = this.routineRepository.createQueryBuilder('routine');

    query.where('routine.isPublished = :isPublished', { isPublished: true });

    if (filter?.partnerId) {
      query.andWhere('routine.partnerId = :partnerId', { partnerId: filter.partnerId });
    }
    if (filter?.routineType) {
      query.andWhere('routine.routineType = :routineType', { routineType: filter.routineType });
    }
    if (filter?.skinType) {
      query.andWhere(':skinType = ANY(routine.skinTypes)', { skinType: filter.skinType });
    }
    if (filter?.skinConcern) {
      query.andWhere(':skinConcern = ANY(routine.skinConcerns)', { skinConcern: filter.skinConcern });
    }

    return query.orderBy('routine.viewCount', 'DESC').getMany();
  }

  async updateRoutine(id: string, dto: UpdatePartnerRoutineDto): Promise<PartnerRoutine> {
    const routine = await this.findById(id);
    if (!routine) {
      throw new Error('Partner routine not found');
    }

    Object.assign(routine, dto);
    return this.routineRepository.save(routine);
  }

  async publishRoutine(id: string): Promise<PartnerRoutine> {
    const routine = await this.findById(id);
    if (!routine) {
      throw new Error('Partner routine not found');
    }

    if (routine.steps.length === 0) {
      throw new Error('Cannot publish routine without steps');
    }

    routine.isPublished = true;
    routine.publishedAt = new Date();
    return this.routineRepository.save(routine);
  }

  async unpublishRoutine(id: string): Promise<PartnerRoutine> {
    const routine = await this.findById(id);
    if (!routine) {
      throw new Error('Partner routine not found');
    }

    routine.isPublished = false;
    return this.routineRepository.save(routine);
  }

  async incrementViewCount(id: string): Promise<PartnerRoutine> {
    const routine = await this.findById(id);
    if (!routine) {
      throw new Error('Partner routine not found');
    }

    routine.viewCount += 1;
    return this.routineRepository.save(routine);
  }

  async incrementLikeCount(id: string): Promise<PartnerRoutine> {
    const routine = await this.findById(id);
    if (!routine) {
      throw new Error('Partner routine not found');
    }

    routine.likeCount += 1;
    return this.routineRepository.save(routine);
  }

  async decrementLikeCount(id: string): Promise<PartnerRoutine> {
    const routine = await this.findById(id);
    if (!routine) {
      throw new Error('Partner routine not found');
    }

    if (routine.likeCount > 0) {
      routine.likeCount -= 1;
    }
    return this.routineRepository.save(routine);
  }

  async getRoutineStats(partnerId: string): Promise<{
    totalRoutines: number;
    publishedRoutines: number;
    totalViews: number;
    totalLikes: number;
    byRoutineType: Record<RoutineType, number>;
  }> {
    const routines = await this.findByPartnerId(partnerId);

    let publishedRoutines = 0;
    let totalViews = 0;
    let totalLikes = 0;

    const byRoutineType: Record<RoutineType, number> = {
      morning: 0,
      evening: 0,
      weekly: 0,
      special: 0,
    };

    for (const routine of routines) {
      if (routine.isPublished) {
        publishedRoutines++;
      }
      totalViews += routine.viewCount;
      totalLikes += routine.likeCount;
      byRoutineType[routine.routineType]++;
    }

    return {
      totalRoutines: routines.length,
      publishedRoutines,
      totalViews,
      totalLikes,
      byRoutineType,
    };
  }

  async getTrendingRoutines(limit: number = 10): Promise<PartnerRoutine[]> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return this.routineRepository.find({
      where: { isPublished: true },
      order: { viewCount: 'DESC', likeCount: 'DESC' },
      take: limit,
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.routineRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
