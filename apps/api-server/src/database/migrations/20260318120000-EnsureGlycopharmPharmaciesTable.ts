/**
 * EnsureGlycopharmPharmaciesTable
 *
 * glycopharm_pharmacies 테이블은 TypeORM synchronize:true로 생성되었으나
 * 명시적 마이그레이션이 없었음. 프로덕션 환경(synchronize:false)에서
 * 테이블 존재를 보장하기 위해 CREATE TABLE IF NOT EXISTS 실행.
 *
 * Idempotent: IF NOT EXISTS 사용.
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureGlycopharmPharmaciesTable20260318120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS glycopharm_pharmacies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL UNIQUE,
        address TEXT,
        phone VARCHAR(50),
        email VARCHAR(255),
        owner_name VARCHAR(100),
        business_number VARCHAR(20) UNIQUE,
        slug VARCHAR(120) UNIQUE,
        description TEXT,
        logo VARCHAR(2000),
        hero_image VARCHAR(2000),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        sort_order INT NOT NULL DEFAULT 0,
        created_by_user_id UUID,
        created_by_user_name VARCHAR(100),
        enabled_services JSONB NOT NULL DEFAULT '[]'::jsonb,
        storefront_config JSONB,
        template_profile VARCHAR(30) NOT NULL DEFAULT 'BASIC',
        storefront_blocks JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_pharmacies_business_number"
      ON glycopharm_pharmacies(business_number) WHERE business_number IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_pharmacies_slug"
      ON glycopharm_pharmacies(slug) WHERE slug IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Don't drop — table may contain production data
  }
}
