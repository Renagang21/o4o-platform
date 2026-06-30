import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-MASTER-REPRESENTATIVE-LINK-FOUNDATION-V1 (additive)
 * 정책: docs/investigations/IR-O4O-STANDARD-PRODUCT-REPRESENTATIVE-GROUPING-AND-STORE-CONTENT-DIRECTION-V1.md
 *       docs/checks/CHECK-O4O-PRODUCT-MASTER-REPRESENTATIVE-LINK-FOUNDATION-V1.md
 *
 * O4O 표준상품 구조에 대표상품(그룹핑) 계층을 위한 최소 DB foundation 을 additive 로 추가한다.
 *   1) representative_products 테이블 (display_name 외 nullable)
 *   2) product_masters.representative_product_id nullable FK (ON DELETE SET NULL)
 *
 * 불변 보장 (이 migration 이 하지 않는 것):
 *   - 기존 product_masters row UPDATE / backfill 없음
 *   - representative_product_id 기본값 없음 (전부 NULL)
 *   - 기존 ProductMaster insert/update 필수값 변경 없음 → 기존 생성 로직 무변경 동작
 *   - 약가마스터 CSV import / 대표상품 자동생성 / ProductIdentifier 자동부착 / candidate 생성 없음
 *   - UNIQUE 제약 없음 (대표상품 자동 중복방지 정책 미생성)
 *
 * Boundary(CLAUDE.md §7): product_masters → representative_products nullable FK 는
 *   Commerce 도메인 경계(ecommerce_order_items/organization_product_listings/
 *   organization_product_channels 참조 금지)에 해당하지 않음 → 위반 아님.
 */
export class CreateRepresentativeProductsAndLink20261202000000 implements MigrationInterface {
  name = 'CreateRepresentativeProductsAndLink20261202000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) representative_products — 대표상품 그룹핑 계층 (신규 빈 테이블)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS representative_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        display_name        VARCHAR(255) NOT NULL,

        -- nullable: 동일 품목기준코드에 여러 업체 혼입 존재 → 자동파생 금지 (별도 import IR 위임)
        manufacturer_name   VARCHAR(255),

        thumbnail_image_id  UUID,
        metadata            JSONB,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 2) product_masters.representative_product_id — nullable FK, ON DELETE SET NULL
    await queryRunner.query(`
      ALTER TABLE product_masters
        ADD COLUMN IF NOT EXISTS representative_product_id UUID NULL
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_product_masters_representative_product'
        ) THEN
          ALTER TABLE product_masters
            ADD CONSTRAINT fk_product_masters_representative_product
            FOREIGN KEY (representative_product_id)
            REFERENCES representative_products(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // 대표상품 → ProductMaster 멤버 목록 조회용 인덱스 (UNIQUE 아님)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_masters_representative_product_id
        ON product_masters (representative_product_id)
    `);

    console.log(
      '[CreateRepresentativeProductsAndLink] representative_products + product_masters.representative_product_id (nullable FK, SET NULL) added. No backfill.',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_product_masters_representative_product_id`);
    await queryRunner.query(
      `ALTER TABLE product_masters DROP CONSTRAINT IF EXISTS fk_product_masters_representative_product`,
    );
    await queryRunner.query(
      `ALTER TABLE product_masters DROP COLUMN IF EXISTS representative_product_id`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS representative_products CASCADE`);
  }
}
