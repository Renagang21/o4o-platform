/**
 * WO-O4O-CARE-IDENTITY-UNIFICATION-USERS-ID-V1
 *
 * Step 0: glucoseview_customers에 user_id 컬럼 추가
 *
 * user_id = users.id 매핑 (email 기반 backfill)
 * Care 도메인의 patient_id 통일을 위한 브릿지 컬럼
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToGlucoseviewCustomers20260326300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add column
    const hasColumn = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'glucoseview_customers' AND column_name = 'user_id'`,
    );
    if (hasColumn.length > 0) {
      console.warn('[Migration] user_id column already exists — skipping ADD');
    } else {
      await queryRunner.query(
        `ALTER TABLE glucoseview_customers ADD COLUMN user_id UUID`,
      );
      console.warn('[Migration] Added user_id column to glucoseview_customers');
    }

    // 2. Backfill from email match
    const updated = await queryRunner.query(
      `UPDATE glucoseview_customers gc
       SET user_id = u.id
       FROM users u
       WHERE gc.email IS NOT NULL
         AND gc.email != ''
         AND LOWER(gc.email) = LOWER(u.email)
         AND gc.user_id IS NULL`,
    );
    const count = updated?.[1] ?? 0;
    console.warn(`[Migration] Backfilled user_id for ${count} glucoseview_customers`);

    // 3. Partial index (only non-null)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_gc_user_id
       ON glucoseview_customers (user_id)
       WHERE user_id IS NOT NULL`,
    );
    console.warn('[Migration] Created partial index idx_gc_user_id');

    // 4. Verify
    const stats = await queryRunner.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(user_id)::int AS has_user_id
       FROM glucoseview_customers`,
    );
    console.warn('[Migration] Stats:', stats[0]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_gc_user_id`);
    await queryRunner.query(
      `ALTER TABLE glucoseview_customers DROP COLUMN IF EXISTS user_id`,
    );
  }
}
