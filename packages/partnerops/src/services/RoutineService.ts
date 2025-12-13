/**
 * Routine Service
 *
 * 파트너 루틴(콘텐츠) 관리 서비스
 *
 * Note: Routine은 PartnerOps 전용 기능으로, Partner-Core에 포함되지 않음.
 * 향후 Partner-Core에 PartnerRoutine 엔티티/서비스 추가 시 위임 방식으로 전환.
 *
 * @package @o4o/partnerops
 */

import type { Repository } from 'typeorm';
import { Partner, executeValidatePartnerVisibility } from '@o4o/partner-core';
import type { PartnerRoutineDto, CreateRoutineDto, UpdateRoutineDto } from '../dto/index.js';

// PartnerOps 전용 Routine Entity (Partner-Core 미포함)
export interface PartnerRoutineEntity {
  id: string;
  partnerId: string;
  title: string;
  description?: string;
  productIds: string[];
  productType?: string;
  status: 'draft' | 'published' | 'archived';
  viewCount: number;
  clickCount: number;
  conversionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class RoutineService {
  constructor(
    private readonly routineRepository: Repository<PartnerRoutineEntity>,
    private readonly partnerRepository: Repository<Partner>
  ) {}

  /**
   * 루틴 목록 조회
   */
  async list(
    partnerId: string,
    filters?: { status?: string; productType?: string }
  ): Promise<PartnerRoutineDto[]> {
    const whereClause: any = { partnerId };

    if (filters?.status) {
      whereClause.status = filters.status;
    }
    if (filters?.productType) {
      whereClause.productType = filters.productType;
    }

    const routines = await this.routineRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });

    // pharmaceutical 필터링
    const filteredRoutines: PartnerRoutineDto[] = [];
    for (const routine of routines) {
      const visibility = await executeValidatePartnerVisibility({
        partnerId,
        productType: routine.productType,
      });

      if (visibility.visible) {
        filteredRoutines.push(this.toRoutineDto(routine));
      }
    }

    return filteredRoutines;
  }

  /**
   * 루틴 상세 조회
   */
  async getById(partnerId: string, id: string): Promise<PartnerRoutineDto | null> {
    const routine = await this.routineRepository.findOne({
      where: { id, partnerId },
    });

    if (!routine) return null;

    // pharmaceutical 필터링
    const visibility = await executeValidatePartnerVisibility({
      partnerId,
      productType: routine.productType,
    });

    if (!visibility.visible) return null;

    return this.toRoutineDto(routine);
  }

  /**
   * 루틴 생성
   */
  async create(partnerId: string, dto: CreateRoutineDto): Promise<PartnerRoutineDto> {
    // pharmaceutical 제품 체크
    const visibility = await executeValidatePartnerVisibility({
      partnerId,
      productType: dto.productType,
    });

    if (!visibility.visible) {
      throw new Error(visibility.reason || 'Product type not allowed for routines');
    }

    const routine = this.routineRepository.create({
      partnerId,
      title: dto.title,
      description: dto.description,
      productIds: dto.productIds,
      productType: dto.productType,
      status: 'draft',
      viewCount: 0,
      clickCount: 0,
      conversionCount: 0,
    });

    const saved = await this.routineRepository.save(routine);
    return this.toRoutineDto(saved);
  }

  /**
   * 루틴 수정
   */
  async update(
    partnerId: string,
    id: string,
    dto: UpdateRoutineDto
  ): Promise<PartnerRoutineDto | null> {
    const routine = await this.routineRepository.findOne({
      where: { id, partnerId },
    });

    if (!routine) return null;

    if (dto.title !== undefined) routine.title = dto.title;
    if (dto.description !== undefined) routine.description = dto.description;
    if (dto.productIds !== undefined) routine.productIds = dto.productIds;
    if (dto.status !== undefined) routine.status = dto.status;

    const saved = await this.routineRepository.save(routine);
    return this.toRoutineDto(saved);
  }

  /**
   * 루틴 삭제
   */
  async delete(partnerId: string, id: string): Promise<boolean> {
    const routine = await this.routineRepository.findOne({
      where: { id, partnerId },
    });

    if (!routine) return false;

    await this.routineRepository.remove(routine);
    return true;
  }

  /**
   * 루틴 발행
   */
  async publish(partnerId: string, id: string): Promise<PartnerRoutineDto | null> {
    return this.update(partnerId, id, { status: 'published' });
  }

  /**
   * 루틴 아카이브
   */
  async archive(partnerId: string, id: string): Promise<PartnerRoutineDto | null> {
    return this.update(partnerId, id, { status: 'archived' });
  }

  /**
   * 조회수 증가
   */
  async incrementViewCount(id: string): Promise<void> {
    await this.routineRepository.increment({ id }, 'viewCount', 1);
  }

  /**
   * 클릭수 증가
   */
  async incrementClickCount(id: string): Promise<void> {
    await this.routineRepository.increment({ id }, 'clickCount', 1);
  }

  /**
   * 파트너별 루틴 통계
   */
  async getStatsByPartnerId(partnerId: string): Promise<{
    totalRoutines: number;
    publishedRoutines: number;
    draftRoutines: number;
    totalViews: number;
    totalClicks: number;
  }> {
    const routines = await this.routineRepository.find({
      where: { partnerId },
    });

    return {
      totalRoutines: routines.length,
      publishedRoutines: routines.filter((r) => r.status === 'published').length,
      draftRoutines: routines.filter((r) => r.status === 'draft').length,
      totalViews: routines.reduce((sum, r) => sum + r.viewCount, 0),
      totalClicks: routines.reduce((sum, r) => sum + r.clickCount, 0),
    };
  }

  /**
   * RoutineEntity → DTO 변환
   */
  private toRoutineDto(routine: PartnerRoutineEntity): PartnerRoutineDto {
    return {
      id: routine.id,
      partnerId: routine.partnerId,
      title: routine.title,
      description: routine.description,
      productIds: routine.productIds,
      productType: routine.productType,
      status: routine.status,
      viewCount: routine.viewCount,
      clickCount: routine.clickCount,
      conversionCount: routine.conversionCount,
      createdAt: routine.createdAt,
      updatedAt: routine.updatedAt,
    };
  }
}

// Factory function
export function createRoutineService(
  routineRepository: Repository<PartnerRoutineEntity>,
  partnerRepository: Repository<Partner>
): RoutineService {
  return new RoutineService(routineRepository, partnerRepository);
}
