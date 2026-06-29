import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `image_import_result` (jsonb, nullable) to supplier_csv_import_batches.
 * WO-O4O-NETURE-PRODUCT-IMPORT-IMAGE-STORAGE-BUCKET-ALIGNMENT-V1
 *
 * 이미지 복사 파이프라인(processImportImages)의 copied/failed 요약을 batch 에 저장해
 * 부분 실패를 공급자에게 명확히 표시한다. (기존엔 조용히 실패 → 가시화)
 * 비파괴: nullable 추가, 기존 row 영향 없음.
 */
export class AddImageImportResultToCsvBatch20261130000000 implements MigrationInterface {
  name = 'AddImageImportResultToCsvBatch20261130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "supplier_csv_import_batches" ADD COLUMN IF NOT EXISTS "image_import_result" jsonb`,
    );
    console.log('[Migration] image_import_result jsonb added to supplier_csv_import_batches');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "supplier_csv_import_batches" DROP COLUMN IF EXISTS "image_import_result"`,
    );
    console.log('[Migration] image_import_result column dropped from supplier_csv_import_batches');
  }
}
