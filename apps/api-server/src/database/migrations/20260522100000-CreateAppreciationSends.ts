import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1
 * 기여 감사 포인트 이력 테이블.
 * service_point_budgets 무관 — user-to-user 직접 이전 구조.
 */
export class CreateAppreciationSends20260522100000 implements MigrationInterface {
  name = 'CreateAppreciationSends20260522100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "appreciation_sends" (
        "id"           uuid        NOT NULL DEFAULT gen_random_uuid(),
        "from_user_id" uuid        NOT NULL,
        "to_user_id"   uuid        NOT NULL,
        "target_type"  varchar(50) NOT NULL,
        "target_id"    uuid        NOT NULL,
        "amount"       integer     NOT NULL,
        "message"      varchar(200),
        "created_at"   timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_appreciation_sends" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_appreciation_sends_from_user" ON "appreciation_sends" ("from_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_appreciation_sends_to_user"   ON "appreciation_sends" ("to_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_appreciation_sends_target"    ON "appreciation_sends" ("target_type", "target_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_appreciation_sends_created"   ON "appreciation_sends" ("created_at")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "appreciation_sends"`);
  }
}
