import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-MASTER-CORE-RESET-V1 — 스펙 정합성 보완
 *
 * 1. regulatory_type VARCHAR(50) NOT NULL 추가
 * 2. mfds_permit_number VARCHAR(100) 추가
 * 3. mfds_synced_at NULL 허용
 * 4. store_product_profiles 테이블 생성
 *
 * NOTE: marketing_name, brand_name은 WO 스펙에 미기재이나
 *       40+ SQL 쿼리에서 사용 중이므로 유지한다 (§11 중단 보고 대상).
 */
export class ProductMasterWOAlignment20260301200000 implements MigrationInterface {
  name = 'ProductMasterWOAlignment20260301200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ================================================================
    // Phase 1: product_masters 컬럼 보완
    // ================================================================

    // regulatory_type 추가 (MFDS 기반 자동 설정)
    await queryRunner.query(`
      ALTER TABLE product_masters
        ADD COLUMN regulatory_type VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN'
    `);

    // mfds_permit_number 추가
    await queryRunner.query(`
      ALTER TABLE product_masters
        ADD COLUMN mfds_permit_number VARCHAR(100)
    `);

    // mfds_synced_at NULL 허용으로 변경 (MFDS 미연동 상태 표현)
    await queryRunner.query(`
      ALTER TABLE product_masters
        ALTER COLUMN mfds_synced_at DROP NOT NULL,
        ALTER COLUMN mfds_synced_at DROP DEFAULT
    `);

    // ================================================================
    // Phase 2: store_product_profiles 테이블 생성
    // ================================================================
    await queryRunner.query(`
      CREATE TABLE store_product_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        organization_id UUID NOT NULL,
        master_id UUID NOT NULL
          REFERENCES product_masters(id) ON DELETE CASCADE,

        display_name VARCHAR(255),
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

        CONSTRAINT uq_store_product_profile UNIQUE (organization_id, master_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_store_product_profiles_org ON store_product_profiles (organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_store_product_profiles_master ON store_product_profiles (master_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // store_product_profiles DROP
    await queryRunner.query(`DROP TABLE IF EXISTS store_product_profiles CASCADE`);

    // product_masters 컬럼 복원
    await queryRunner.query(`ALTER TABLE product_masters DROP COLUMN IF EXISTS regulatory_type`);
    await queryRunner.query(`ALTER TABLE product_masters DROP COLUMN IF EXISTS mfds_permit_number`);
    await queryRunner.query(`
      ALTER TABLE product_masters
        ALTER COLUMN mfds_synced_at SET NOT NULL,
        ALTER COLUMN mfds_synced_at SET DEFAULT NOW()
    `);
  }
}
