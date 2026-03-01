import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-MASTER-CORE-RESET-V1
 *
 * STRUCTURE RESET — 플랫폼 상품 SSOT 재정의
 *
 * 1. 기존 상품 종속 데이터 전부 제거
 * 2. neture_supplier_products 테이블 DROP
 * 3. product_masters 테이블 CREATE (Core SSOT)
 * 4. supplier_product_offers 테이블 CREATE (공급 Offer)
 * 5. organization_product_listings FK 재구성
 * 6. product_approvals FK 재구성
 */
export class ProductMasterCoreReset20260301100000 implements MigrationInterface {
  name = 'ProductMasterCoreReset20260301100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ================================================================
    // Phase 1: 기존 종속 데이터 제거 (역순)
    // ================================================================

    // 1-1. 캠페인 테이블 DROP (product_id FK 종속)
    await queryRunner.query(`DROP TABLE IF EXISTS neture_campaign_aggregations CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS neture_time_limited_price_campaigns CASCADE`);

    // 1-2. 채널 매핑 TRUNCATE (listing 종속)
    await queryRunner.query(`TRUNCATE TABLE organization_product_channels CASCADE`);

    // 1-3. product_approvals TRUNCATE (product_id FK)
    await queryRunner.query(`TRUNCATE TABLE product_approvals CASCADE`);

    // 1-4. organization_product_listings TRUNCATE
    await queryRunner.query(`TRUNCATE TABLE organization_product_listings CASCADE`);

    // ================================================================
    // Phase 2: neture_supplier_products DROP
    // ================================================================
    await queryRunner.query(`DROP TABLE IF EXISTS neture_supplier_products CASCADE`);

    // 기존 enum 타입 정리 (사용하지 않는 enum DROP)
    await queryRunner.query(`DROP TYPE IF EXISTS neture_supplier_products_purpose_enum CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS neture_supplier_products_distribution_type_enum CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS neture_supplier_products_approval_status_enum CASCADE`);

    // ================================================================
    // Phase 3: product_masters 생성 (Core SSOT)
    // ================================================================
    await queryRunner.query(`
      CREATE TABLE product_masters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        barcode VARCHAR(14) NOT NULL,
        regulatory_name VARCHAR(255) NOT NULL,
        marketing_name VARCHAR(255) NOT NULL,
        brand_name VARCHAR(255),
        manufacturer_name VARCHAR(255) NOT NULL,

        mfds_product_id VARCHAR(100) NOT NULL,
        is_mfds_verified BOOLEAN NOT NULL DEFAULT TRUE,
        mfds_synced_at TIMESTAMP NOT NULL DEFAULT NOW(),

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

        CONSTRAINT uq_product_masters_barcode UNIQUE (barcode),
        CONSTRAINT uq_product_masters_mfds_product_id UNIQUE (mfds_product_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_product_masters_barcode ON product_masters (barcode)`);
    await queryRunner.query(`CREATE INDEX idx_product_masters_manufacturer ON product_masters (manufacturer_name)`);

    // ================================================================
    // Phase 4: supplier_product_offers 생성
    // ================================================================

    // Enum 타입 생성
    await queryRunner.query(`
      CREATE TYPE supplier_product_offers_distribution_type_enum
        AS ENUM ('PUBLIC', 'SERVICE', 'PRIVATE')
    `);
    await queryRunner.query(`
      CREATE TYPE supplier_product_offers_approval_status_enum
        AS ENUM ('PENDING', 'APPROVED', 'REJECTED')
    `);

    await queryRunner.query(`
      CREATE TABLE supplier_product_offers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        master_id UUID NOT NULL
          REFERENCES product_masters(id) ON DELETE RESTRICT,

        supplier_id UUID NOT NULL
          REFERENCES neture_suppliers(id) ON DELETE CASCADE,

        distribution_type supplier_product_offers_distribution_type_enum
          NOT NULL DEFAULT 'PRIVATE',

        approval_status supplier_product_offers_approval_status_enum
          NOT NULL DEFAULT 'PENDING',

        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        allowed_seller_ids TEXT[],

        price_general INT NOT NULL DEFAULT 0,
        price_gold INT,
        price_platinum INT,
        consumer_reference_price INT,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

        CONSTRAINT uq_supplier_product_offers_master_supplier
          UNIQUE (master_id, supplier_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_supplier_product_offers_master ON supplier_product_offers (master_id)`);
    await queryRunner.query(`CREATE INDEX idx_supplier_product_offers_supplier ON supplier_product_offers (supplier_id)`);
    await queryRunner.query(`CREATE INDEX idx_supplier_product_offers_approval ON supplier_product_offers (approval_status)`);

    // ================================================================
    // Phase 5: organization_product_listings FK 재구성
    // ================================================================

    // 기존 컬럼 제거
    await queryRunner.query(`ALTER TABLE organization_product_listings DROP COLUMN IF EXISTS product_id`);
    await queryRunner.query(`ALTER TABLE organization_product_listings DROP COLUMN IF EXISTS product_name`);
    await queryRunner.query(`ALTER TABLE organization_product_listings DROP COLUMN IF EXISTS product_metadata`);
    await queryRunner.query(`ALTER TABLE organization_product_listings DROP COLUMN IF EXISTS retail_price`);
    await queryRunner.query(`ALTER TABLE organization_product_listings DROP COLUMN IF EXISTS display_order`);

    // 신규 FK 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
        ADD COLUMN master_id UUID NOT NULL
          REFERENCES product_masters(id) ON DELETE RESTRICT,
        ADD COLUMN offer_id UUID NOT NULL
          REFERENCES supplier_product_offers(id) ON DELETE CASCADE,
        ADD COLUMN price NUMERIC(12,2)
    `);

    // UNIQUE 제약 재정의 (조직 × 서비스 × offer 기준)
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_org_listing_unique"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_org_listing_unique_v2
        ON organization_product_listings (organization_id, service_key, offer_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_org_listing_master
        ON organization_product_listings (master_id)
    `);

    // ================================================================
    // Phase 6: product_approvals FK 재구성
    // ================================================================

    // product_id → offer_id 변경
    await queryRunner.query(`ALTER TABLE product_approvals DROP COLUMN IF EXISTS product_id`);
    await queryRunner.query(`
      ALTER TABLE product_approvals
        ADD COLUMN offer_id UUID
          REFERENCES supplier_product_offers(id) ON DELETE CASCADE
    `);

    // UNIQUE 제약 재정의
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_product_approval_unique"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_product_approval_unique_v2
        ON product_approvals (offer_id, organization_id, approval_type)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down migration: 되돌리기 (구조만, 데이터 복원 불가)
    // product_approvals: offer_id → product_id 복원
    await queryRunner.query(`DROP INDEX IF EXISTS idx_product_approval_unique_v2`);
    await queryRunner.query(`ALTER TABLE product_approvals DROP COLUMN IF EXISTS offer_id`);
    await queryRunner.query(`ALTER TABLE product_approvals ADD COLUMN product_id UUID`);

    // organization_product_listings: 신규 컬럼 제거, 원래 컬럼 복원
    await queryRunner.query(`DROP INDEX IF EXISTS idx_org_listing_unique_v2`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_org_listing_master`);
    await queryRunner.query(`ALTER TABLE organization_product_listings DROP COLUMN IF EXISTS master_id`);
    await queryRunner.query(`ALTER TABLE organization_product_listings DROP COLUMN IF EXISTS offer_id`);
    await queryRunner.query(`ALTER TABLE organization_product_listings DROP COLUMN IF EXISTS price`);
    await queryRunner.query(`ALTER TABLE organization_product_listings ADD COLUMN product_id UUID`);
    await queryRunner.query(`ALTER TABLE organization_product_listings ADD COLUMN product_name VARCHAR(300)`);
    await queryRunner.query(`ALTER TABLE organization_product_listings ADD COLUMN product_metadata JSONB DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE organization_product_listings ADD COLUMN retail_price INT`);
    await queryRunner.query(`ALTER TABLE organization_product_listings ADD COLUMN display_order INT DEFAULT 0`);

    // supplier_product_offers DROP
    await queryRunner.query(`DROP TABLE IF EXISTS supplier_product_offers CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS supplier_product_offers_distribution_type_enum CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS supplier_product_offers_approval_status_enum CASCADE`);

    // product_masters DROP
    await queryRunner.query(`DROP TABLE IF EXISTS product_masters CASCADE`);

    // neture_supplier_products 재생성은 불가 (데이터 손실)
    // 필요시 이전 마이그레이션 참조
  }
}
