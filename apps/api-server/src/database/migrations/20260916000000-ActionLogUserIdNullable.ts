import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-ACTION-LOG-ANONYMOUS-UUID-FIX-V1
 *
 * action_logs.user_id 컬럼을 nullable로 변경.
 * 로그인 실패 등 인증 전 액션의 경우 user_id가 없으므로 NULL 허용이 맞다.
 * 기존 데이터는 영향 없음.
 */
export class ActionLogUserIdNullable20260916000000 implements MigrationInterface {
  name = 'ActionLogUserIdNullable20260916000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "action_logs"
      ALTER COLUMN "user_id" DROP NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // NULL 값이 있으면 NOT NULL 복원 불가 — 수동 처리 필요
    await queryRunner.query(`
      UPDATE "action_logs" SET "user_id" = '00000000-0000-0000-0000-000000000000' WHERE "user_id" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "action_logs"
      ALTER COLUMN "user_id" SET NOT NULL
    `);
  }
}
