import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1 §5
 * 매장 경영자 계약 종료 → 반환 → 종료 → 7일 파기 lifecycle SSOT.
 *
 * 사용자 데이터 본문/export payload는 저장하지 않고 진행상태와 기한만 기록한다.
 */
export class CreateStoreOwnerTerminationCases1789701000000 implements MigrationInterface {
  name = 'CreateStoreOwnerTerminationCases1789701000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE store_owner_termination_cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_key VARCHAR(50) NOT NULL,
        organization_id UUID NOT NULL,
        user_id UUID NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'requested',
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        requested_by UUID,
        return_requested BOOLEAN NOT NULL DEFAULT FALSE,
        return_completed_at TIMESTAMPTZ,
        termination_effective_at TIMESTAMPTZ NOT NULL,
        purge_due_at TIMESTAMPTZ NOT NULL,
        purge_completed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        failure_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "CHK_store_owner_termination_cases_status"
          CHECK (status IN (
            'requested','return_pending','return_completed','termination_scheduled',
            'terminated','purge_completed','cancelled','failed'
          )),
        CONSTRAINT "CHK_store_owner_termination_cases_purge_due"
          CHECK (purge_due_at >= termination_effective_at),
        CONSTRAINT "FK_store_owner_termination_cases_user"
          FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT "FK_store_owner_termination_cases_requested_by"
          FOREIGN KEY (requested_by) REFERENCES users(id),
        CONSTRAINT "FK_store_owner_termination_cases_org"
          FOREIGN KEY (organization_id) REFERENCES organizations(id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_store_owner_termination_cases_service_status"
        ON store_owner_termination_cases (service_key, status)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_store_owner_termination_cases_org"
        ON store_owner_termination_cases (organization_id)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_store_owner_termination_cases_purge_due"
        ON store_owner_termination_cases (purge_due_at)
        WHERE status IN ('terminated','failed')
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_store_owner_termination_cases_open"
        ON store_owner_termination_cases (user_id, service_key, organization_id)
        WHERE status NOT IN ('purge_completed','cancelled')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS store_owner_termination_cases');
  }
}
