/**
 * PartnerRoutineService
 *
 * 파트너 루틴 관리 서비스
 * - 루틴 생성/수정/조회
 * - 조회수/좋아요/저장 추적
 * - 전환 통계
 */

import type { Repository } from 'typeorm';
import { PartnerRoutine, RoutineType, RoutineVisibility, RoutineStep } from '../entities/partner-routine.entity';

export interface CreatePartnerRoutineDto {
  partnerId: string;
  title: string;
  description?: string;
  routineType: RoutineType;
  visibility?: RoutineVisibility;
  skinTypes?: string[];
  skinConcerns?: string[];
  steps: RoutineStep[];
  thumbnailUrl?: string;
}

export interface UpdatePartnerRoutineDto {
  title?: string;
  description?: string;
  routineType?: RoutineType;
  visibility?: RoutineVisibility;
  skinTypes?: string[];
  skinConcerns?: string[];
  steps?: RoutineStep[];
  thumbnailUrl?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
}

export class PartnerRoutineService {
  constructor(private readonly repository: Repository<PartnerRoutine>) {}

  /**
   * 루틴 생성
   */
  async createRoutine(dto: CreatePartnerRoutineDto): Promise<PartnerRoutine> {
    const routine = this.repository.create({
      ...dto,
      visibility: dto.visibility || 'public',
      isPublished: false,
    });

    return this.repository.save(routine);
  }

  /**
   * ID로 루틴 조회
   */
  async findById(id: string): Promise<PartnerRoutine | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * 파트너 ID로 루틴 목록 조회
   */
  async findByPartnerId(
    partnerId: string,
    options?: {
      routineType?: RoutineType;
      isPublished?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: PartnerRoutine[]; total: number }> {
    const { routineType, isPublished, page = 1, limit = 20 } = options || {};

    const queryBuilder = this.repository
      .createQueryBuilder('routine')
      .where('routine.partnerId = :partnerId', { partnerId });

    if (routineType) {
      queryBuilder.andWhere('routine.routineType = :routineType', { routineType });
    }

    if (isPublished !== undefined) {
      queryBuilder.andWhere('routine.isPublished = :isPublished', { isPublished });
    }

    queryBuilder.orderBy('routine.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  /**
   * 공개 루틴 목록 조회 (피부 타입/고민 필터)
   */
  async findPublicRoutines(options?: {
    skinType?: string;
    skinConcern?: string;
    routineType?: RoutineType;
    page?: number;
    limit?: number;
  }): Promise<{ items: PartnerRoutine[]; total: number }> {
    const { skinType, skinConcern, routineType, page = 1, limit = 20 } = options || {};

    const queryBuilder = this.repository
      .createQueryBuilder('routine')
      .where('routine.isPublished = :isPublished', { isPublished: true })
      .andWhere('routine.visibility = :visibility', { visibility: 'public' });

    if (routineType) {
      queryBuilder.andWhere('routine.routineType = :routineType', { routineType });
    }

    if (skinType) {
      queryBuilder.andWhere(':skinType = ANY(routine.skinTypes)', { skinType });
    }

    if (skinConcern) {
      queryBuilder.andWhere(':skinConcern = ANY(routine.skinConcerns)', { skinConcern });
    }

    queryBuilder.orderBy('routine.viewCount', 'DESC');
    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  /**
   * 루틴 업데이트
   */
  async updateRoutine(id: string, dto: UpdatePartnerRoutineDto): Promise<PartnerRoutine | null> {
    const updatePayload: Record<string, unknown> = {};

    if (dto.title !== undefined) updatePayload.title = dto.title;
    if (dto.description !== undefined) updatePayload.description = dto.description;
    if (dto.routineType !== undefined) updatePayload.routineType = dto.routineType;
    if (dto.visibility !== undefined) updatePayload.visibility = dto.visibility;
    if (dto.skinTypes !== undefined) updatePayload.skinTypes = dto.skinTypes;
    if (dto.skinConcerns !== undefined) updatePayload.skinConcerns = dto.skinConcerns;
    if (dto.steps !== undefined) updatePayload.steps = dto.steps;
    if (dto.thumbnailUrl !== undefined) updatePayload.thumbnailUrl = dto.thumbnailUrl;
    if (dto.isPublished !== undefined) {
      updatePayload.isPublished = dto.isPublished;
      if (dto.isPublished === true) {
        updatePayload.publishedAt = new Date();
      }
    }
    if (dto.isFeatured !== undefined) updatePayload.isFeatured = dto.isFeatured;

    if (Object.keys(updatePayload).length > 0) {
      await this.repository.update(id, updatePayload);
    }
    return this.findById(id);
  }

  /**
   * 루틴 발행
   */
  async publishRoutine(id: string): Promise<PartnerRoutine | null> {
    await this.repository.update(id, {
      isPublished: true,
      publishedAt: new Date(),
    });
    return this.findById(id);
  }

  /**
   * 루틴 발행 취소
   */
  async unpublishRoutine(id: string): Promise<PartnerRoutine | null> {
    await this.repository.update(id, { isPublished: false });
    return this.findById(id);
  }

  /**
   * 조회수 증가
   */
  async incrementViewCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'viewCount', 1);
  }

  /**
   * 좋아요 증가
   */
  async incrementLikeCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'likeCount', 1);
  }

  /**
   * 저장수 증가
   */
  async incrementSaveCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'saveCount', 1);
  }

  /**
   * 전환 카운트 및 수익 증가
   */
  async incrementConversion(id: string, earnings: number): Promise<void> {
    await this.repository.increment({ id }, 'conversionCount', 1);
    await this.repository.increment({ id }, 'totalEarnings', earnings);
  }

  /**
   * 루틴 통계 조회
   */
  async getRoutineStats(partnerId: string): Promise<{
    totalRoutines: number;
    publishedRoutines: number;
    totalViews: number;
    totalLikes: number;
    totalConversions: number;
    totalEarnings: number;
  }> {
    const result = await this.repository
      .createQueryBuilder('routine')
      .select([
        'COUNT(*) as totalRoutines',
        'SUM(CASE WHEN routine.isPublished = true THEN 1 ELSE 0 END) as publishedRoutines',
        'SUM(routine.viewCount) as totalViews',
        'SUM(routine.likeCount) as totalLikes',
        'SUM(routine.conversionCount) as totalConversions',
        'SUM(routine.totalEarnings) as totalEarnings',
      ])
      .where('routine.partnerId = :partnerId', { partnerId })
      .getRawOne();

    return {
      totalRoutines: parseInt(result.totalRoutines) || 0,
      publishedRoutines: parseInt(result.publishedRoutines) || 0,
      totalViews: parseInt(result.totalViews) || 0,
      totalLikes: parseInt(result.totalLikes) || 0,
      totalConversions: parseInt(result.totalConversions) || 0,
      totalEarnings: parseFloat(result.totalEarnings) || 0,
    };
  }

  /**
   * 루틴 삭제
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
