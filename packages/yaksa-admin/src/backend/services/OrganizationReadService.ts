/**
 * OrganizationReadService
 *
 * yaksa-admin Phase 1: Read-Only Organization Service
 *
 * === 역할 ===
 * - organization-core의 Organization 데이터 조회
 * - 지부/분회 목록 조회
 * - 조직 상세 정보 조회
 *
 * === 제한 ===
 * - READ ONLY (생성/수정/삭제 금지)
 * - organization-core Entity 직접 사용
 */

import type { Repository, DataSource } from 'typeorm';

/**
 * Organization 조회 결과 타입
 */
export interface OrganizationDto {
  id: string;
  name: string;
  code: string;
  type: 'national' | 'division' | 'branch';
  parentId?: string;
  level: number;
  path: string;
  metadata?: Record<string, any>;
  isActive: boolean;
  childrenCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 조직 목록 조회 옵션
 */
export interface ListOrganizationsOptions {
  type?: 'national' | 'division' | 'branch';
  parentId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * 조직 목록 조회 결과
 */
export interface ListOrganizationsResult {
  items: OrganizationDto[];
  total: number;
  limit: number;
  offset: number;
}

export class OrganizationReadService {
  private dataSource: DataSource | null = null;

  /**
   * DataSource 초기화
   */
  initialize(dataSource: DataSource): void {
    this.dataSource = dataSource;
  }

  /**
   * 조직 목록 조회
   */
  async listOrganizations(options: ListOrganizationsOptions = {}): Promise<ListOrganizationsResult> {
    if (!this.dataSource) {
      throw new Error('OrganizationReadService not initialized');
    }

    const { type, parentId, isActive = true, limit = 50, offset = 0 } = options;

    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select('*')
      .from('organizations', 'org')
      .where('org.isActive = :isActive', { isActive });

    if (type) {
      queryBuilder.andWhere('org.type = :type', { type });
    }

    if (parentId) {
      queryBuilder.andWhere('org.parentId = :parentId', { parentId });
    }

    // Count total
    const countResult = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('organizations', 'org')
      .where('org.isActive = :isActive', { isActive })
      .getRawOne();

    const total = parseInt(countResult?.count || '0', 10);

    // Get items with pagination
    const items = await queryBuilder
      .orderBy('org.level', 'ASC')
      .addOrderBy('org.name', 'ASC')
      .limit(limit)
      .offset(offset)
      .getRawMany();

    return {
      items: items.map(this.mapToDto),
      total,
      limit,
      offset,
    };
  }

  /**
   * 단일 조직 조회
   */
  async getOrganization(id: string): Promise<OrganizationDto | null> {
    if (!this.dataSource) {
      throw new Error('OrganizationReadService not initialized');
    }

    const result = await this.dataSource
      .createQueryBuilder()
      .select('*')
      .from('organizations', 'org')
      .where('org.id = :id', { id })
      .getRawOne();

    return result ? this.mapToDto(result) : null;
  }

  /**
   * 조직 코드로 조회
   */
  async getOrganizationByCode(code: string): Promise<OrganizationDto | null> {
    if (!this.dataSource) {
      throw new Error('OrganizationReadService not initialized');
    }

    const result = await this.dataSource
      .createQueryBuilder()
      .select('*')
      .from('organizations', 'org')
      .where('org.code = :code', { code })
      .getRawOne();

    return result ? this.mapToDto(result) : null;
  }

  /**
   * 하위 조직 목록 조회
   */
  async getChildOrganizations(parentId: string): Promise<OrganizationDto[]> {
    if (!this.dataSource) {
      throw new Error('OrganizationReadService not initialized');
    }

    const items = await this.dataSource
      .createQueryBuilder()
      .select('*')
      .from('organizations', 'org')
      .where('org.parentId = :parentId', { parentId })
      .andWhere('org.isActive = :isActive', { isActive: true })
      .orderBy('org.name', 'ASC')
      .getRawMany();

    return items.map(this.mapToDto);
  }

  /**
   * 지부 목록 조회 (Yaksa 특화)
   */
  async listDivisions(): Promise<OrganizationDto[]> {
    return this.listOrganizations({ type: 'division' }).then(r => r.items);
  }

  /**
   * 분회 목록 조회 (Yaksa 특화)
   */
  async listBranches(divisionId?: string): Promise<OrganizationDto[]> {
    const options: ListOrganizationsOptions = { type: 'branch' };
    if (divisionId) {
      options.parentId = divisionId;
    }
    return this.listOrganizations(options).then(r => r.items);
  }

  /**
   * Raw 데이터를 DTO로 변환
   */
  private mapToDto(raw: any): OrganizationDto {
    return {
      id: raw.id,
      name: raw.name,
      code: raw.code,
      type: raw.type,
      parentId: raw.parentId || raw.parent_id || undefined,
      level: raw.level,
      path: raw.path,
      metadata: raw.metadata,
      isActive: raw.isActive ?? raw.is_active ?? true,
      childrenCount: raw.childrenCount ?? raw.children_count ?? 0,
      createdAt: new Date(raw.createdAt || raw.created_at),
      updatedAt: new Date(raw.updatedAt || raw.updated_at),
    };
  }
}

export const organizationReadService = new OrganizationReadService();
