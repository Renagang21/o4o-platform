import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-STORE-LOCAL-PRODUCT-REGISTRATION-ENHANCEMENT-V1
 *
 * StoreLocalProduct 에 선택 입력 바코드 컬럼 추가.
 * - varchar(64) nullable — 숫자형 금지(앞자리 0 보존), 빈 값은 애플리케이션에서 null 정규화.
 * - 스캔/OCR/외부조회/중복제한 없음. 단순 식별 메모 필드.
 *
 * nullable → 기존 행 영향 없음. Commerce 필드 아님. Display Domain 전용.
 */
export class AddBarcodeToStoreLocalProduct20261201000000 implements MigrationInterface {
  name = 'AddBarcodeToStoreLocalProduct20261201000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "store_local_products"
        ADD COLUMN IF NOT EXISTS "barcode" varchar(64)
    `);
    console.log('[AddBarcodeToStoreLocalProduct] barcode varchar(64) nullable column added.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "store_local_products"
        DROP COLUMN IF EXISTS "barcode"
    `);
  }
}
