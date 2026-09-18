import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1 §5
 *
 * store_owner_termination_cases — 매장 경영자 계약 종료·반환·7일 파기 절차의 상태 원장.
 * 개인정보/반환 payload 자체를 저장하지 않고 진행상태·기한·완료시각만 기록한다.
 *
 * 삭제 정책:
 * - users / organizations FK = RESTRICT (계약 종료 case 증빙 보존, 무분별 cascade 금지)
 * - 계약 종료는 membership/role 및 매장 데이터 lifecycle 이 담당하며 사용자/조직 row hard delete 가 아니다.
 */
export class CreateStoreOwnerTerminationCases1789695000000 implements MigrationInterface {
  name = 'CreateStoreOwnerTerminationCases1789695000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE store_owner_termination_cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_key VARCHAR(50) NOT NULL,
        organization_id UUID NOT NULL,
        user_id UUID NOT NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'requested',
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        requested_by UUID NOT NULL,
        return_requested BOOLEAN NOT NULL DEFAULT false,
        return_completed_at TIMESTAMPTZ,
        termination_effective_at TIMESTAMPTZ,
        purge_due_at TIMESTAMPTZ,
        purge_completed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        failure_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "CHK_store_owner_termination_cases_status"
          CHECK (status IN (
            'requested',
            'return_pending',
            'return_completed',
            'termination_scheduled',
            'terminated',
            'purge_completed',
            'cancelled',
            'failed'
          )),
        CONSTRAINT "FK_store_owner_termination_cases_org"
          FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT "FK_store_owner_termination_cases_user"
          FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT "FK_store_owner_termination_cases_requested_by"
          FOREIGN KEY (requested_by) REFERENCES users(id)
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
        WHERE status IN ('terminated', 'failed') AND purge_completed_at IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_store_owner_termination_cases_open"
        ON store_owner_termination_cases (service_key, organization_id)
        WHERE status NOT IN ('purge_completed', 'cancelled')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS store_owner_termination_cases');
  }
}
