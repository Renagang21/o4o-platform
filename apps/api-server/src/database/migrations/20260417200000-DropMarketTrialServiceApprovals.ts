import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-CLEANUP-1: ServiceApproval 레거시 완전 제거
 * WO-MARKET-TRIAL-NETURE-SINGLE-APPROVAL-TRANSITION-V1
 *
 * Market Trial 2차 승인 구조 완전 제거.
 * Neture 단일 승인 원칙 확정에 따라 market_trial_service_approvals 테이블 드롭.
 *
 * 롤백 전략: down() 에서 테이블 재생성 가능하나, 데이터는 복구 불가.
 * 배포 전 운영 데이터 확인 권장.
 */
export class DropMarketTrialServiceApprovals1771200000019 implements MigrationInterface {
  name = 'DropMarketTrialServiceApprovals1771200000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 잔존 레코드 수 확인 (로그용)
    const countResult = await queryRunner.query(
      `SELECT COUNT(*)::int AS cnt FROM information_schema.tables WHERE table_name = 'market_trial_service_approvals'`,
    );
    const tableExists = countResult[0]?.cnt > 0;

    if (!tableExists) {
      return; // 이미 없는 경우 스킵
    }

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mtsa_service_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mtsa_trial"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "market_trial_service_approvals"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백: 테이블 재생성 (데이터 없음)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "market_trial_service_approvals" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "trial_id" UUID NOT NULL,
        "service_key" VARCHAR(50) NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "reviewed_by" UUID,
        "reviewed_at" TIMESTAMP,
        "reason" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE("trial_id", "service_key")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mtsa_trial"
        ON "market_trial_service_approvals" ("trial_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mtsa_service_status"
        ON "market_trial_service_approvals" ("service_key", "status")
    `);
  }
}
