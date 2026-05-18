/**
 * OrganizationOpsService
 *
 * WO-O4O-ORGANIZATION-SERVICE-CENTRALIZATION-V1
 *
 * Organization 생성/멤버십/서비스등록의 단일 실행 진입점.
 * 기존 분산된 raw SQL을 표준화하여 중앙 집중.
 *
 * 핵심 원칙:
 *  - 모든 INSERT는 ON CONFLICT DO NOTHING (멱등성)
 *  - queryRunner 옵션으로 트랜잭션 지원
 *  - 기존 테이블 구조 변경 없음
 */

import { QueryRunner } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import logger from '../../../utils/logger.js';

// ─── Types ──────────────────────────────────────

export interface EnsureOrganizationInput {
  name: string;
  code: string;
  type: string;
  metadata?: Record<string, any>;
  parentId?: string;
  createdByUserId?: string;
  isActive?: boolean;
}

export interface EnsureOrganizationResult {
  id: string;
  created: boolean;
}

export interface AddMemberInput {
  organizationId: string;
  userId: string;
  role: string;
  isPrimary?: boolean;
}

export interface EnrollServiceInput {
  organizationId: string;
  serviceCode: string;
  config?: Record<string, any>;
}

// ─── Service ────────────────────────────────────

class OrganizationOpsService {
  /**
   * 조직 생성 (없으면 생성, 있으면 반환)
   *
   * ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
   * → 기존 supplier.service.ts syncSupplierOrganization 패턴 통일
   */
  async ensureOrganization(
    input: EnsureOrganizationInput,
    queryRunner?: QueryRunner,
  ): Promise<EnsureOrganizationResult> {
    const query = queryRunner
      ? queryRunner.query.bind(queryRunner)
      : AppDataSource.query.bind(AppDataSource);

    const metadata = input.metadata ? JSON.stringify(input.metadata) : '{}';
    const isActive = input.isActive ?? true;
    // WO-O4O-KPA-ENSURE-ORG-PATH-SEPARATE-PARAM-V1:
    //   $2 가 VALUES($2) = varchar 와 LOWER($2::text) 에 동시 사용되면
    //   PostgreSQL prepared statement 가 'inconsistent types deduced for parameter $2'
    //   (42P08) 을 발생시킨다 — $2::text cast 만으로는 해결 불가.
    //   path 값을 JS 에서 미리 계산한 뒤 $8 로 분리하여 타입 충돌 원천 차단.
    const pathValue = '/' + input.code.toLowerCase();

    // WO-O4O-KPA-ORGANIZATIONS-RAW-SQL-COLUMN-ALIGNMENT-V1:
    //   organizations 의 원본 컬럼은 camelCase quoted ("parentId", "isActive", "childrenCount",
    //   "createdAt", "updatedAt") — connection.ts:570 SnakeNamingStrategy 비활성 정책.
    //   Phase A 확장 컬럼만 snake_case (created_by_user_id, business_number, ...).
    //   기존 raw SQL 이 snake_case 로 잘못 작성되어 sohae21@naver.com 등 신규 pharmacy_owner
    //   승인 시 `column "parent_id" of relation "organizations" does not exist` 로 실패하던 것을 정정.
    const rows = await query(
      `INSERT INTO organizations (id, name, code, type, metadata, "parentId", created_by_user_id, "isActive", level, path, "childrenCount", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, $5, $6, $7, 0, $8, 0, NOW(), NOW())
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         metadata = organizations.metadata || EXCLUDED.metadata,
         "updatedAt" = NOW()
       RETURNING id, (xmax = 0) AS created`,
      [input.name, input.code, input.type, metadata, input.parentId || null, input.createdByUserId || null, isActive, pathValue],
    );

    const row = Array.isArray(rows) && rows.length > 0
      ? (Array.isArray(rows[0]) ? rows[0][0] : rows[0])
      : null;

    if (!row) {
      throw new Error(`[OrganizationOpsService] ensureOrganization failed for code=${input.code}`);
    }

    return {
      id: row.id,
      created: row.created === true || row.created === 't',
    };
  }

  /**
   * 멤버 추가 (멱등)
   *
   * ON CONFLICT (organization_id, user_id) DO NOTHING
   */
  async addMember(
    input: AddMemberInput,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const query = queryRunner
      ? queryRunner.query.bind(queryRunner)
      : AppDataSource.query.bind(AppDataSource);

    await query(
      `INSERT INTO organization_members
         (id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW(), NOW())
       ON CONFLICT (organization_id, user_id) DO NOTHING`,
      [input.organizationId, input.userId, input.role, input.isPrimary ?? false],
    );
  }

  /**
   * 소유자 설정 — addMember(role='owner', isPrimary=true) 편의 메서드
   */
  async setOwner(
    organizationId: string,
    userId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    await this.addMember(
      { organizationId, userId, role: 'owner', isPrimary: true },
      queryRunner,
    );
  }

  /**
   * 서비스 등록 (멱등)
   *
   * ON CONFLICT (organization_id, service_code) DO NOTHING
   */
  async enrollService(
    input: EnrollServiceInput,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const query = queryRunner
      ? queryRunner.query.bind(queryRunner)
      : AppDataSource.query.bind(AppDataSource);

    const config = input.config ? JSON.stringify(input.config) : '{}';

    await query(
      `INSERT INTO organization_service_enrollments
         (id, organization_id, service_code, status, enrolled_at, config, created_at, updated_at)
       VALUES
         (gen_random_uuid(), $1, $2, 'active', NOW(), $3::jsonb, NOW(), NOW())
       ON CONFLICT (organization_id, service_code) DO NOTHING`,
      [input.organizationId, input.serviceCode, config],
    );
  }

  /**
   * 조직 조회 (by ID)
   */
  async getOrganization(
    id: string,
    queryRunner?: QueryRunner,
  ): Promise<{ id: string; name: string; code: string; type: string; metadata: any } | null> {
    const query = queryRunner
      ? queryRunner.query.bind(queryRunner)
      : AppDataSource.query.bind(AppDataSource);

    const rows = await query(
      `SELECT id, name, code, type, metadata FROM organizations WHERE id = $1`,
      [id],
    );

    return rows?.[0] || null;
  }

  /**
   * 조직 조회 (by code)
   */
  async getOrganizationByCode(
    code: string,
    queryRunner?: QueryRunner,
  ): Promise<{ id: string; name: string; code: string; type: string; metadata: any } | null> {
    const query = queryRunner
      ? queryRunner.query.bind(queryRunner)
      : AppDataSource.query.bind(AppDataSource);

    const rows = await query(
      `SELECT id, name, code, type, metadata FROM organizations WHERE code = $1`,
      [code],
    );

    return rows?.[0] || null;
  }

  /**
   * 조직 생성 + 소유자 + 서비스 등록 — 3단계 일괄 처리
   *
   * 가장 일반적인 패턴 (supplier approve, pharmacy approve 등)
   */
  async ensureOrganizationWithOwnerAndService(
    orgInput: EnsureOrganizationInput,
    ownerUserId: string,
    serviceCode: string,
    queryRunner?: QueryRunner,
  ): Promise<EnsureOrganizationResult> {
    const result = await this.ensureOrganization(orgInput, queryRunner);

    await this.setOwner(result.id, ownerUserId, queryRunner);

    await this.enrollService(
      { organizationId: result.id, serviceCode },
      queryRunner,
    );

    logger.info('[OrganizationOpsService] ensureOrganizationWithOwnerAndService', {
      orgId: result.id,
      code: orgInput.code,
      ownerUserId,
      serviceCode,
      created: result.created,
    });

    return result;
  }
}

// ─── Singleton ──────────────────────────────────

export const organizationOpsService = new OrganizationOpsService();
export { OrganizationOpsService };
