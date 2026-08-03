import { DataSource, Repository } from 'typeorm';
import { MemberCategory } from '../entities/MemberCategory.js';

export interface CreateMemberCategoryDto {
  name: string;
  description?: string;
  requiresAnnualFee?: boolean;
  annualFeeAmount?: number;
  sortOrder?: number;
  metadata?: Record<string, any>;
}

export interface UpdateMemberCategoryDto {
  name?: string;
  description?: string;
  requiresAnnualFee?: boolean;
  annualFeeAmount?: number;
  isActive?: boolean;
  sortOrder?: number;
  metadata?: Record<string, any>;
}

/**
 * MemberCategoryService
 *
 * 회원 분류 관리 서비스
 */
export class MemberCategoryService {
  private repo: Repository<MemberCategory>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(MemberCategory);
  }

  async create(dto: CreateMemberCategoryDto): Promise<MemberCategory> {
    const existing = await this.repo.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new Error(`Category "${dto.name}" already exists`);
    }

    const category = this.repo.create(dto);
    return await this.repo.save(category);
  }

  async update(id: string, dto: UpdateMemberCategoryDto): Promise<MemberCategory> {
    const category = await this.findById(id);
    if (!category) {
      throw new Error(`Category "${id}" not found`);
    }

    Object.assign(category, dto);
    return await this.repo.save(category);
  }

  async findById(id: string): Promise<MemberCategory | null> {
    return await this.repo.findOne({ where: { id } });
  }

  /**
   * 회원 분류 목록 조회.
   *
   * WO-O4O-ADMIN-MEMBERSHIP-INACTIVE-CATEGORY-LIST-FIX-V1
   *   기본값은 기존과 동일하게 **활성 분류만** 반환한다.
   *   일반 회원용 선택 목록 등 향후 소비처가 비활성 분류를 보게 되면 안 되므로
   *   전체 조회는 명시적 opt-in(`includeInactive: true`)으로만 허용한다.
   *   관리자 목록(GET /api/v1/membership/categories)은 비활성 분류를 다시
   *   활성화할 수 있어야 하므로 opt-in 하여 활성·비활성을 모두 반환한다.
   *
   * 정렬(sortOrder ASC, name ASC)과 응답 구조는 변경하지 않는다.
   */
  async list(options?: { includeInactive?: boolean }): Promise<MemberCategory[]> {
    return await this.repo.find({
      ...(options?.includeInactive ? {} : { where: { isActive: true } }),
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async delete(id: string): Promise<void> {
    const category = await this.findById(id);
    if (!category) {
      throw new Error(`Category "${id}" not found`);
    }
    await this.repo.remove(category);
  }
}
