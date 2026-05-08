/**
 * WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1
 *
 * kpa_store_contents 테이블을 최소 확장:
 * 1. snapshot_id — nullable로 변경 (direct 생성 지원)
 * 2. source_type — 'snapshot_edit' | 'direct' 구분
 * 3. UNIQUE 제약 → partial unique index (snapshot_id IS NOT NULL 조건)
 *
 * 기존 데이터: snapshot_id IS NOT NULL → source_type='snapshot_edit' (DEFAULT)
 * 신규 데이터: snapshot_id IS NULL → source_type='direct'
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendKpaStoreContentsForDirect20260917000000 implements MigrationInterface {
  name = 'ExtendKpaStoreContentsForDirect20260917000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. source_type 컬럼 추가 (DEFAULT 'snapshot_edit')
    const colCheck = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'kpa_store_contents'
        AND column_name = 'source_type'
    `);
    if (colCheck.length === 0) {
      await queryRunner.query(`
        ALTER TABLE kpa_store_contents
          ADD COLUMN source_type VARCHAR(30) NOT NULL DEFAULT 'snapshot_edit'
      `);
      console.log('[Migration] kpa_store_contents.source_type added');
    }

    // 2. snapshot_id NOT NULL 제약 제거 (nullable로 변경)
    await queryRunner.query(`
      ALTER TABLE kpa_store_contents
        ALTER COLUMN snapshot_id DROP NOT NULL
    `);
    console.log('[Migration] kpa_store_contents.snapshot_id is now nullable');

    // 3. 기존 UNIQUE 제약 제거
    const constraintCheck = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'kpa_store_contents'
        AND constraint_name = 'UQ_kpa_store_contents_snap_org'
        AND constraint_type = 'UNIQUE'
    `);
    if (constraintCheck.length > 0) {
      await queryRunner.query(`
        ALTER TABLE kpa_store_contents
          DROP CONSTRAINT "UQ_kpa_store_contents_snap_org"
      `);
      console.log('[Migration] UQ_kpa_store_contents_snap_org dropped');
    }

    // 4. Partial unique index로 교체 (snapshot_id IS NOT NULL 행만 적용)
    const idxCheck = await queryRunner.query(`
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'kpa_store_contents'
        AND indexname = 'UQ_kpa_store_contents_snap_org_partial'
    `);
    if (idxCheck.length === 0) {
      await queryRunner.query(`
        CREATE UNIQUE INDEX "UQ_kpa_store_contents_snap_org_partial"
          ON kpa_store_contents (snapshot_id, organization_id)
          WHERE snapshot_id IS NOT NULL
      `);
      console.log('[Migration] UQ_kpa_store_contents_snap_org_partial created');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 역순으로 복원
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_kpa_store_contents_snap_org_partial"`);

    await queryRunner.query(`
      ALTER TABLE kpa_store_contents
        ADD CONSTRAINT "UQ_kpa_store_contents_snap_org"
          UNIQUE (snapshot_id, organization_id)
    `);

    await queryRunner.query(`
      ALTER TABLE kpa_store_contents
        ALTER COLUMN snapshot_id SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE kpa_store_contents DROP COLUMN IF EXISTS source_type
    `);
  }
}
