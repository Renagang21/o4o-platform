/**
 * OfficerReadService
 *
 * yaksa-admin Phase 1: Read-Only Officer (임원) Service
 *
 * === 역할 ===
 * - role_assignments 테이블 조회 (organization 스코프)
 * - 조직별 임원 목록 조회
 * - 임원 역할 현황 조회
 *
 * === 제한 ===
 * - READ ONLY
 * - 임원 할당은 별도 Phase에서 구현
 */

import type { DataSource } from 'typeorm';

/**
 * 임원 역할 할당 조회 결과 타입
 */
export interface OfficerAssignmentDto {
  id: string;
  userId: string;
  role: string;
  scopeType: 'global' | 'organization';
  scopeId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Enriched fields
  organizationName?: string;
  userName?: string;
  userEmail?: string;
}

/**
 * 임원 목록 조회 옵션
 */
export interface ListOfficersOptions {
  organizationId?: string;
  role?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * 임원 목록 조회 결과
 */
export interface ListOfficersResult {
  items: OfficerAssignmentDto[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * 약사회 임원 역할 정의
 */
export const YAKSA_OFFICER_ROLES = {
  DIVISION_PRESIDENT: '지부장',
  DIVISION_VICE_PRESIDENT: '부지부장',
  DIVISION_SECRETARY: '총무',
  DIVISION_TREASURER: '재무',
  BRANCH_PRESIDENT: '분회장',
  BRANCH_VICE_PRESIDENT: '부분회장',
  BRANCH_SECRETARY: '총무',
  AUDITOR: '감사',
  DIRECTOR: '이사',
} as const;

export class OfficerReadService {
  private dataSource: DataSource | null = null;

  /**
   * DataSource 초기화
   */
  initialize(dataSource: DataSource): void {
    this.dataSource = dataSource;
  }

  /**
   * 임원 목록 조회
   */
  async listOfficers(options: ListOfficersOptions = {}): Promise<ListOfficersResult> {
    if (!this.dataSource) {
      throw new Error('OfficerReadService not initialized');
    }

    const {
      organizationId,
      role,
      isActive = true,
      limit = 50,
      offset = 0,
    } = options;

    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select('ra.*')
      .addSelect('org.name', 'organizationName')
      .from('role_assignments', 'ra')
      .leftJoin('organizations', 'org', 'org.id = ra.scopeId')
      .where('ra.scopeType = :scopeType', { scopeType: 'organization' })
      .andWhere('ra.isActive = :isActive', { isActive });

    if (organizationId) {
      queryBuilder.andWhere('ra.scopeId = :organizationId', { organizationId });
    }

    if (role) {
      queryBuilder.andWhere('ra.role = :role', { role });
    }

    // Count total
    const countQuery = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('role_assignments', 'ra')
      .where('ra.scopeType = :scopeType', { scopeType: 'organization' })
      .andWhere('ra.isActive = :isActive', { isActive });

    if (organizationId) {
      countQuery.andWhere('ra.scopeId = :organizationId', { organizationId });
    }

    const countResult = await countQuery.getRawOne();
    const total = parseInt(countResult?.count || '0', 10);

    // Get items with pagination
    const items = await queryBuilder
      .orderBy('ra.role', 'ASC')
      .addOrderBy('ra.createdAt', 'DESC')
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
   * 특정 조직의 임원 수 조회
   */
  async getOfficerCount(organizationId: string): Promise<number> {
    if (!this.dataSource) {
      throw new Error('OfficerReadService not initialized');
    }

    const result = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('role_assignments', 'ra')
      .where('ra.scopeType = :scopeType', { scopeType: 'organization' })
      .andWhere('ra.scopeId = :organizationId', { organizationId })
      .andWhere('ra.isActive = :isActive', { isActive: true })
      .getRawOne();

    return parseInt(result?.count || '0', 10);
  }

  /**
   * 조직별 역할별 임원 통계
   */
  async getOfficerStatsByRole(organizationId: string): Promise<Record<string, number>> {
    if (!this.dataSource) {
      throw new Error('OfficerReadService not initialized');
    }

    const results = await this.dataSource
      .createQueryBuilder()
      .select('ra.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .from('role_assignments', 'ra')
      .where('ra.scopeType = :scopeType', { scopeType: 'organization' })
      .andWhere('ra.scopeId = :organizationId', { organizationId })
      .andWhere('ra.isActive = :isActive', { isActive: true })
      .groupBy('ra.role')
      .getRawMany();

    const stats: Record<string, number> = {};
    for (const row of results) {
      stats[row.role] = parseInt(row.count, 10);
    }

    return stats;
  }

  /**
   * 특정 사용자의 임원 역할 조회
   */
  async getUserOfficerRoles(userId: string): Promise<OfficerAssignmentDto[]> {
    if (!this.dataSource) {
      throw new Error('OfficerReadService not initialized');
    }

    const items = await this.dataSource
      .createQueryBuilder()
      .select('ra.*')
      .addSelect('org.name', 'organizationName')
      .from('role_assignments', 'ra')
      .leftJoin('organizations', 'org', 'org.id = ra.scopeId')
      .where('ra.userId = :userId', { userId })
      .andWhere('ra.scopeType = :scopeType', { scopeType: 'organization' })
      .andWhere('ra.isActive = :isActive', { isActive: true })
      .orderBy('ra.role', 'ASC')
      .getRawMany();

    return items.map(this.mapToDto);
  }

  /**
   * 조직장 조회 (지부장/분회장)
   */
  async getOrganizationHead(organizationId: string): Promise<OfficerAssignmentDto | null> {
    if (!this.dataSource) {
      throw new Error('OfficerReadService not initialized');
    }

    // 지부장 또는 분회장 역할 검색
    const headRoles = ['DIVISION_PRESIDENT', 'BRANCH_PRESIDENT', '지부장', '분회장'];

    const result = await this.dataSource
      .createQueryBuilder()
      .select('ra.*')
      .addSelect('org.name', 'organizationName')
      .from('role_assignments', 'ra')
      .leftJoin('organizations', 'org', 'org.id = ra.scopeId')
      .where('ra.scopeType = :scopeType', { scopeType: 'organization' })
      .andWhere('ra.scopeId = :organizationId', { organizationId })
      .andWhere('ra.role IN (:...headRoles)', { headRoles })
      .andWhere('ra.isActive = :isActive', { isActive: true })
      .getRawOne();

    return result ? this.mapToDto(result) : null;
  }

  /**
   * Raw 데이터를 DTO로 변환
   */
  private mapToDto(raw: any): OfficerAssignmentDto {
    return {
      id: raw.id,
      userId: raw.userId || raw.user_id,
      role: raw.role,
      scopeType: raw.scopeType || raw.scope_type,
      scopeId: raw.scopeId || raw.scope_id || undefined,
      isActive: raw.isActive ?? raw.is_active ?? true,
      createdAt: new Date(raw.createdAt || raw.created_at),
      updatedAt: new Date(raw.updatedAt || raw.updated_at),
      organizationName: raw.organizationName,
      userName: raw.userName,
      userEmail: raw.userEmail,
    };
  }
}

export const officerReadService = new OfficerReadService();
