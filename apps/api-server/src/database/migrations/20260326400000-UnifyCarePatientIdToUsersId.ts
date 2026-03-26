/**
 * WO-O4O-CARE-IDENTITY-UNIFICATION-USERS-ID-V1
 *
 * Step 1: Care 테이블 patient_id를 glucoseview_customers.id → users.id 로 변환
 *
 * 대상 6개 테이블 (이미 users.id인 테이블 제외):
 *   health_readings, care_kpi_snapshots, care_coaching_sessions,
 *   care_coaching_drafts, care_llm_insights, care_alerts
 *
 * 안전장치:
 *   - gc.user_id IS NOT NULL인 경우만 변환 (계정 없는 환자 보존)
 *   - patient_id != gc.user_id 조건으로 이미 변환된 행 재처리 방지
 *   - 각 테이블별 dry-run 카운트 로그
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

const CARE_TABLES = [
  'health_readings',
  'care_kpi_snapshots',
  'care_coaching_sessions',
  'care_coaching_drafts',
  'care_llm_insights',
  'care_alerts',
] as const;

export class UnifyCarePatientIdToUsersId20260326400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of CARE_TABLES) {
      // Check table exists
      const exists = await queryRunner.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1`,
        [table],
      );
      if (exists.length === 0) {
        console.warn(`[Migration] Table ${table} not found — skipping`);
        continue;
      }

      // Dry-run count
      const dryRun = await queryRunner.query(
        `SELECT COUNT(*)::int AS cnt
         FROM ${table} t
         JOIN glucoseview_customers gc ON gc.id = t.patient_id
         WHERE gc.user_id IS NOT NULL
           AND t.patient_id != gc.user_id`,
      );
      const toMigrate = dryRun[0]?.cnt ?? 0;
      console.warn(`[Migration] ${table}: ${toMigrate} rows to migrate`);

      if (toMigrate === 0) continue;

      // Execute migration
      const result = await queryRunner.query(
        `UPDATE ${table} t
         SET patient_id = gc.user_id
         FROM glucoseview_customers gc
         WHERE t.patient_id = gc.id
           AND gc.user_id IS NOT NULL
           AND t.patient_id != gc.user_id`,
      );
      const affected = result?.[1] ?? 0;
      console.warn(`[Migration] ${table}: ${affected} rows migrated`);
    }

    // Final verification
    console.warn('[Migration] === Verification ===');
    for (const table of CARE_TABLES) {
      const exists = await queryRunner.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1`,
        [table],
      );
      if (exists.length === 0) continue;

      const remaining = await queryRunner.query(
        `SELECT COUNT(*)::int AS cnt
         FROM ${table} t
         JOIN glucoseview_customers gc ON gc.id = t.patient_id
         WHERE gc.user_id IS NOT NULL`,
      );
      console.warn(`[Migration] ${table}: ${remaining[0]?.cnt ?? 0} rows still referencing gc.id (expected 0)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: convert users.id back to gc.id
    for (const table of CARE_TABLES) {
      const exists = await queryRunner.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1`,
        [table],
      );
      if (exists.length === 0) continue;

      await queryRunner.query(
        `UPDATE ${table} t
         SET patient_id = gc.id
         FROM glucoseview_customers gc
         WHERE t.patient_id = gc.user_id
           AND gc.user_id IS NOT NULL`,
      );
    }
  }
}
