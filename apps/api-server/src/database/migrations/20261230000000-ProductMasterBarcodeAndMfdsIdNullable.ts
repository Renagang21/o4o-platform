import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-BARCODE-NULLABLE-AND-INTERNAL-CODE-GENERATION-STOP-V1 (Phase B)
 * 선행 설계: CHECK-O4O-PRODUCT-IDENTITY-UUID-AND-EXTERNAL-IDENTIFIER-SEPARATION-DESIGN-V1
 *
 * 상품 정체성 = ProductMaster.id(UUID). barcode = 실제 바코드만(없으면 NULL), mfds_product_id = 공식 값만(없으면 NULL).
 *   - product_masters.barcode: DROP NOT NULL
 *   - product_masters.mfds_product_id: DROP NOT NULL
 *   - barcode UNIQUE(uq_product_masters_barcode) → 값 있는 행에만 적용하는 partial unique index 로 교체
 *     (PostgreSQL plain UNIQUE 도 다중 NULL 허용이나, 의도를 명시적으로 표현)
 *
 * barcode_source 는 이번 WO 에서 건드리지 않는다(레거시 이관 WO 에서 정리). 기존 데이터 무변경.
 *
 * 비가역 경계: 배포 후 신규 바코드리스 등록이 barcode=NULL 로 쌓이므로, down 에서 NOT NULL 재설정은
 *   NULL 행이 있으면 실패한다 → down 은 partial index → 일반 UNIQUE 로만 되돌리고 NOT NULL 은 재설정하지 않는다.
 */
export class ProductMasterBarcodeAndMfdsIdNullable20261230000000 implements MigrationInterface {
  name = 'ProductMasterBarcodeAndMfdsIdNullable20261230000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. NOT NULL 해제
    await queryRunner.query(`ALTER TABLE product_masters ALTER COLUMN barcode DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE product_masters ALTER COLUMN mfds_product_id DROP NOT NULL`);

    // 2. barcode UNIQUE → partial unique(값 있는 행만). 기존 제약 제거 후 partial index 생성.
    await queryRunner.query(`ALTER TABLE product_masters DROP CONSTRAINT IF EXISTS uq_product_masters_barcode`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_product_masters_barcode ON product_masters (barcode) WHERE barcode IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // partial unique index → 일반 UNIQUE 제약 복원. (NOT NULL 은 NULL 행 존재 가능성 때문에 재설정하지 않음)
    await queryRunner.query(`DROP INDEX IF EXISTS uq_product_masters_barcode`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_product_masters_barcode') THEN
          ALTER TABLE product_masters ADD CONSTRAINT uq_product_masters_barcode UNIQUE (barcode);
        END IF;
      END $$;
    `);
  }
}
