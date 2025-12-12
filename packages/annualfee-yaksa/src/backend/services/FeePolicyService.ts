import { DataSource, Repository } from 'typeorm';
import {
  FeePolicy,
  PharmacistTypeRule,
  OfficialRoleRule,
  ExemptionRule,
  OrganizationRule,
} from '../entities/FeePolicy.js';

export interface CreateFeePolicyDto {
  name: string;
  year: number;
  baseAmount: number;
  divisionFeeAmount?: number;
  branchFeeAmount?: number;
  pharmacistTypeRules?: PharmacistTypeRule[];
  officialRoleRules?: OfficialRoleRule[];
  exemptionRules?: ExemptionRule[];
  organizationRules?: OrganizationRule[];
  dueDate?: string;
  earlyPaymentDate?: string;
  description?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateFeePolicyDto extends Partial<CreateFeePolicyDto> {}

/**
 * FeePolicyService
 *
 * 회비 정책 관리 서비스
 */
export class FeePolicyService {
  private repo: Repository<FeePolicy>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(FeePolicy);
  }

  /**
   * 정책 생성
   */
  async create(dto: CreateFeePolicyDto): Promise<FeePolicy> {
    // 같은 연도의 정책이 이미 있는지 확인
    const existing = await this.repo.findOne({
      where: { year: dto.year },
    });
    if (existing) {
      throw new Error(`Policy for year ${dto.year} already exists`);
    }

    const policy = this.repo.create({
      ...dto,
      divisionFeeAmount: dto.divisionFeeAmount ?? 0,
      branchFeeAmount: dto.branchFeeAmount ?? 0,
      dueDate: dto.dueDate ?? '03-31',
      isActive: dto.isActive ?? true,
    });

    return await this.repo.save(policy);
  }

  /**
   * 정책 조회 (ID)
   */
  async findById(id: string): Promise<FeePolicy | null> {
    return await this.repo.findOne({ where: { id } });
  }

  /**
   * 정책 조회 (연도)
   */
  async findByYear(year: number): Promise<FeePolicy | null> {
    return await this.repo.findOne({ where: { year } });
  }

  /**
   * 활성 정책 조회 (연도)
   */
  async findActiveByYear(year: number): Promise<FeePolicy | null> {
    return await this.repo.findOne({
      where: { year, isActive: true },
    });
  }

  /**
   * 현재 연도 정책 조회
   */
  async findCurrentYearPolicy(): Promise<FeePolicy | null> {
    const currentYear = new Date().getFullYear();
    return await this.findActiveByYear(currentYear);
  }

  /**
   * 정책 목록 조회
   */
  async findAll(options?: {
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ policies: FeePolicy[]; total: number }> {
    const queryBuilder = this.repo.createQueryBuilder('policy');

    if (options?.isActive !== undefined) {
      queryBuilder.where('policy.isActive = :isActive', {
        isActive: options.isActive,
      });
    }

    queryBuilder.orderBy('policy.year', 'DESC');

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }
    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    const [policies, total] = await queryBuilder.getManyAndCount();
    return { policies, total };
  }

  /**
   * 정책 수정
   */
  async update(id: string, dto: UpdateFeePolicyDto): Promise<FeePolicy> {
    const policy = await this.findById(id);
    if (!policy) {
      throw new Error(`Policy "${id}" not found`);
    }

    // 연도 변경 시 중복 확인
    if (dto.year && dto.year !== policy.year) {
      const existing = await this.findByYear(dto.year);
      if (existing) {
        throw new Error(`Policy for year ${dto.year} already exists`);
      }
    }

    Object.assign(policy, dto);
    return await this.repo.save(policy);
  }

  /**
   * 정책 삭제
   */
  async delete(id: string): Promise<void> {
    const policy = await this.findById(id);
    if (!policy) {
      throw new Error(`Policy "${id}" not found`);
    }
    await this.repo.remove(policy);
  }

  /**
   * 정책 활성화/비활성화
   */
  async setActive(id: string, isActive: boolean): Promise<FeePolicy> {
    const policy = await this.findById(id);
    if (!policy) {
      throw new Error(`Policy "${id}" not found`);
    }

    policy.isActive = isActive;
    return await this.repo.save(policy);
  }

  /**
   * 연도 정책 복제 (다음 연도 정책 생성용)
   */
  async cloneForNextYear(sourceYear: number): Promise<FeePolicy> {
    const sourcePolicy = await this.findByYear(sourceYear);
    if (!sourcePolicy) {
      throw new Error(`Source policy for year ${sourceYear} not found`);
    }

    const nextYear = sourceYear + 1;
    const existing = await this.findByYear(nextYear);
    if (existing) {
      throw new Error(`Policy for year ${nextYear} already exists`);
    }

    const newPolicy = this.repo.create({
      name: sourcePolicy.name.replace(String(sourceYear), String(nextYear)),
      year: nextYear,
      baseAmount: sourcePolicy.baseAmount,
      divisionFeeAmount: sourcePolicy.divisionFeeAmount,
      branchFeeAmount: sourcePolicy.branchFeeAmount,
      pharmacistTypeRules: sourcePolicy.pharmacistTypeRules,
      officialRoleRules: sourcePolicy.officialRoleRules,
      exemptionRules: sourcePolicy.exemptionRules,
      organizationRules: sourcePolicy.organizationRules,
      dueDate: sourcePolicy.dueDate,
      earlyPaymentDate: sourcePolicy.earlyPaymentDate,
      description: `${nextYear}년 회비 정책 (${sourceYear}년 정책 복제)`,
      isActive: false, // 복제된 정책은 비활성 상태로 생성
    });

    return await this.repo.save(newPolicy);
  }

  /**
   * 정책 규칙 추가/수정
   */
  async updateRules(
    id: string,
    ruleType: 'pharmacistType' | 'officialRole' | 'exemption' | 'organization',
    rules: any[]
  ): Promise<FeePolicy> {
    const policy = await this.findById(id);
    if (!policy) {
      throw new Error(`Policy "${id}" not found`);
    }

    switch (ruleType) {
      case 'pharmacistType':
        policy.pharmacistTypeRules = rules as PharmacistTypeRule[];
        break;
      case 'officialRole':
        policy.officialRoleRules = rules as OfficialRoleRule[];
        break;
      case 'exemption':
        policy.exemptionRules = rules as ExemptionRule[];
        break;
      case 'organization':
        policy.organizationRules = rules as OrganizationRule[];
        break;
    }

    return await this.repo.save(policy);
  }
}
