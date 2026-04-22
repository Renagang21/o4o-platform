import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-FORUM-CREATION-STATE-MACHINE-AND-ORPHAN-ZERO-V1
 *
 * 1. forum_category_requests에 error_message 컬럼 추가
 * 2. status 컬럼 길이를 20 → 30으로 확장 (creating/completed/failed 추가)
 * 3. 기존 approved + createdCategoryId 있는 row → completed로 마이그레이션
 *    (이미 포럼이 생성되었으므로 completed가 정확한 상태)
 * 4. approved + createdCategoryId 없는 row 삭제 (고아 row 방지)
 */
export class ForumRequestStateMachineColumns20260601200000 implements MigrationInterface {
  name = 'ForumRequestStateMachineColumns20260601200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. error_message 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE forum_category_requests
      ADD COLUMN IF NOT EXISTS error_message TEXT
    `);

    // 2. status 컬럼 길이 확장 (varchar(20) → varchar(30))
    await queryRunner.query(`
      ALTER TABLE forum_category_requests
      ALTER COLUMN status TYPE VARCHAR(30)
    `);

    // 3. approved + createdCategoryId 있는 row → completed
    await queryRunner.query(`
      UPDATE forum_category_requests
      SET status = 'completed'
      WHERE status = 'approved'
        AND created_category_id IS NOT NULL
    `);

    // 4. approved + createdCategoryId 없는 고아 row 삭제
    await queryRunner.query(`
      DELETE FROM forum_category_requests
      WHERE status = 'approved'
        AND created_category_id IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // completed → approved 복구 (best effort)
    await queryRunner.query(`
      UPDATE forum_category_requests
      SET status = 'approved'
      WHERE status IN ('completed', 'creating', 'failed')
    `);

    await queryRunner.query(`
      ALTER TABLE forum_category_requests
      ALTER COLUMN status TYPE VARCHAR(20)
    `);

    await queryRunner.query(`
      ALTER TABLE forum_category_requests
      DROP COLUMN IF EXISTS error_message
    `);
  }
}
