import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-REVISION-REQUEST-AND-AUTO-DELETE-V1 (additive)
 *
 * 운영자가 공급자 STORE 설명서에 "수정 요청"을 할 수 있도록 additive nullable 컬럼을 추가한다.
 * 수정 요청 후 revision_due_at(기본 +30일) 경과 시 자동 삭제(hard delete) 대상이 된다.
 *
 * 추가:
 *   - review_note             TEXT      null  → 운영자 수정 요청 사유 메모(공급자에게 노출)
 *   - revision_requested_at   TIMESTAMP null  → 운영자가 수정 요청한 시각
 *   - revision_due_at         TIMESTAMP null  → 재검수 요청 마감 시각(기본 revision_requested_at + 30일)
 *   - idx_shared_product_descriptions_revision_due (partial: status='revision_requested' AND revision_due_at NOT NULL)
 *       만료 자동 삭제 job 스캔용. 대부분 row 는 대상 아님 → partial 로 소형 유지.
 *
 * 불변 보장 (이 migration 이 하지 않는 것):
 *   - 기존 row 백필하지 않음 (신규 수정 요청부터 세팅)
 *   - status 값·의미 변경하지 않음 (revision_requested 는 varchar union 추가; enum 아님)
 *   - source_type / source_ref_id / created_by / created_by_supplier_id / curated_by 무변경 → AUTO-CREDIT 무영향
 *   - canonical partial unique 무영향 (신규 컬럼은 유니크 키 밖)
 */
export class AddRevisionRequestToSharedProductDescriptions20270121000000
  implements MigrationInterface
{
  name = 'AddRevisionRequestToSharedProductDescriptions20270121000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shared_product_descriptions
        ADD COLUMN IF NOT EXISTS review_note TEXT,
        ADD COLUMN IF NOT EXISTS revision_requested_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS revision_due_at TIMESTAMP
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_shared_product_descriptions_revision_due
        ON shared_product_descriptions (revision_due_at)
       WHERE status = 'revision_requested' AND revision_due_at IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_shared_product_descriptions_revision_due`,
    );
    await queryRunner.query(`
      ALTER TABLE shared_product_descriptions
        DROP COLUMN IF EXISTS revision_due_at,
        DROP COLUMN IF EXISTS revision_requested_at,
        DROP COLUMN IF EXISTS review_note
    `);
  }
}
