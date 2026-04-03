import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-A-OPERATOR-DASHBOARD-RECOVERY-V1
 *
 * kpa_approval_requests 테이블 생성.
 * 엔티티는 존재하나 마이그레이션이 누락되어 DB에 테이블이 없었음.
 * 운영자 대시보드 + 강사/강좌/포럼/가입 승인 흐름 전체가 이 테이블에 의존.
 */
export class CreateKpaApprovalRequestsTable1712170800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpa_approval_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(50) NOT NULL,
        organization_id UUID NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',

        requester_id UUID NOT NULL,
        requester_name VARCHAR(100) NOT NULL,
        requester_email VARCHAR(200),

        reviewed_by UUID,
        reviewed_at TIMESTAMP,
        review_comment TEXT,
        revision_note TEXT,

        result_entity_id UUID,
        result_metadata JSONB,

        submitted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpa_approval_requests_type_org_status
        ON kpa_approval_requests (entity_type, organization_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpa_approval_requests_requester_type
        ON kpa_approval_requests (requester_id, entity_type)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS kpa_approval_requests`);
  }
}
