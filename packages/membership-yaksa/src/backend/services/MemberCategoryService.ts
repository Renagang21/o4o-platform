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

  async list(): Promise<MemberCategory[]> {
    return await this.repo.find({
      where: { isActive: true },
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
