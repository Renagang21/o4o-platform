/**
 * MemberReadService
 *
 * yaksa-admin Phase 1: Read-Only Member Service
 *
 * === 역할 ===
 * - organization_members 테이블 조회
 * - 조직별 회원 목록 조회
 * - 회원 승인 대기 목록 조회 (membership-yaksa 연계)
 *
 * === 제한 ===
 * - READ ONLY (생성/수정/삭제는 membership-yaksa에서 처리)
 */

import type { DataSource } from 'typeorm';

/**
 * 조직 멤버 조회 결과 타입
 */
export interface OrganizationMemberDto {
  id: string;
  organizationId: string;
  userId: string;
  role: 'admin' | 'manager' | 'member' | 'moderator';
  isPrimary: boolean;
  metadata?: Record<string, any>;
  joinedAt: Date;
  leftAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Enriched fields (optional)
  organizationName?: string;
  userName?: string;
  userEmail?: string;
}

/**
 * 멤버 목록 조회 옵션
 */
export interface ListMembersOptions {
  organizationId?: string;
  role?: 'admin' | 'manager' | 'member' | 'moderator';
  isPrimary?: boolean;
  includeLeft?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * 멤버 목록 조회 결과
 */
export interface ListMembersResult {
  items: OrganizationMemberDto[];
  total: number;
  limit: number;
  offset: number;
}

export class MemberReadService {
  private dataSource: DataSource | null = null;

  /**
   * DataSource 초기화
   */
  initialize(dataSource: DataSource): void {
    this.dataSource = dataSource;
  }

  /**
   * 조직 멤버 목록 조회
   */
  async listMembers(options: ListMembersOptions = {}): Promise<ListMembersResult> {
    if (!this.dataSource) {
      throw new Error('MemberReadService not initialized');
    }

    const {
      organizationId,
      role,
      isPrimary,
      includeLeft = false,
      limit = 50,
      offset = 0,
    } = options;

    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select('om.*')
      .addSelect('org.name', 'organizationName')
      .from('organization_members', 'om')
      .leftJoin('organizations', 'org', 'org.id = om.organizationId');

    if (!includeLeft) {
      queryBuilder.where('om.leftAt IS NULL');
    }

    if (organizationId) {
      queryBuilder.andWhere('om.organizationId = :organizationId', { organizationId });
    }

    if (role) {
      queryBuilder.andWhere('om.role = :role', { role });
    }

    if (isPrimary !== undefined) {
      queryBuilder.andWhere('om.isPrimary = :isPrimary', { isPrimary });
    }

    // Count total
    const countQuery = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('organization_members', 'om');

    if (!includeLeft) {
      countQuery.where('om.leftAt IS NULL');
    }

    if (organizationId) {
      countQuery.andWhere('om.organizationId = :organizationId', { organizationId });
    }

    const countResult = await countQuery.getRawOne();
    const total = parseInt(countResult?.count || '0', 10);

    // Get items with pagination
    const items = await queryBuilder
      .orderBy('om.joinedAt', 'DESC')
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
   * 특정 조직의 멤버 수 조회
   */
  async getMemberCount(organizationId: string): Promise<number> {
    if (!this.dataSource) {
      throw new Error('MemberReadService not initialized');
    }

    const result = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('organization_members', 'om')
      .where('om.organizationId = :organizationId', { organizationId })
      .andWhere('om.leftAt IS NULL')
      .getRawOne();

    return parseInt(result?.count || '0', 10);
  }

  /**
   * 조직별 역할별 멤버 수 통계
   */
  async getMemberStatsByRole(organizationId: string): Promise<Record<string, number>> {
    if (!this.dataSource) {
      throw new Error('MemberReadService not initialized');
    }

    const results = await this.dataSource
      .createQueryBuilder()
      .select('om.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .from('organization_members', 'om')
      .where('om.organizationId = :organizationId', { organizationId })
      .andWhere('om.leftAt IS NULL')
      .groupBy('om.role')
      .getRawMany();

    const stats: Record<string, number> = {};
    for (const row of results) {
      stats[row.role] = parseInt(row.count, 10);
    }

    return stats;
  }

  /**
   * 특정 사용자의 조직 멤버십 조회
   */
  async getUserMemberships(userId: string): Promise<OrganizationMemberDto[]> {
    if (!this.dataSource) {
      throw new Error('MemberReadService not initialized');
    }

    const items = await this.dataSource
      .createQueryBuilder()
      .select('om.*')
      .addSelect('org.name', 'organizationName')
      .from('organization_members', 'om')
      .leftJoin('organizations', 'org', 'org.id = om.organizationId')
      .where('om.userId = :userId', { userId })
      .andWhere('om.leftAt IS NULL')
      .orderBy('om.isPrimary', 'DESC')
      .addOrderBy('om.joinedAt', 'ASC')
      .getRawMany();

    return items.map(this.mapToDto);
  }

  /**
   * 조직의 관리자 목록 조회 (Yaksa 특화)
   */
  async getOrganizationAdmins(organizationId: string): Promise<OrganizationMemberDto[]> {
    return this.listMembers({
      organizationId,
      role: 'admin',
    }).then(r => r.items);
  }

  /**
   * Raw 데이터를 DTO로 변환
   */
  private mapToDto(raw: any): OrganizationMemberDto {
    return {
      id: raw.id,
      organizationId: raw.organizationId || raw.organization_id,
      userId: raw.userId || raw.user_id,
      role: raw.role,
      isPrimary: raw.isPrimary ?? raw.is_primary ?? false,
      metadata: raw.metadata,
      joinedAt: new Date(raw.joinedAt || raw.joined_at),
      leftAt: raw.leftAt || raw.left_at ? new Date(raw.leftAt || raw.left_at) : undefined,
      createdAt: new Date(raw.createdAt || raw.created_at),
      updatedAt: new Date(raw.updatedAt || raw.updated_at),
      organizationName: raw.organizationName,
      userName: raw.userName,
      userEmail: raw.userEmail,
    };
  }
}

export const memberReadService = new MemberReadService();
