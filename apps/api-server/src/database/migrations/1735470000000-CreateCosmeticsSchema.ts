/**
 * CreateCosmeticsSchema Migration
 *
 * Phase 7-A-1: Cosmetics API Implementation
 * Creates cosmetics schema and all related tables
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCosmeticsSchema1735470000000 implements MigrationInterface {
  name = 'CreateCosmeticsSchema1735470000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create schema
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS cosmetics`);

    // 2. Create cosmetics_brands table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cosmetics.cosmetics_brands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) NOT NULL UNIQUE,
        description TEXT,
        logo_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cosmetics_brands_name
      ON cosmetics.cosmetics_brands(name)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cosmetics_brands_slug
      ON cosmetics.cosmetics_brands(slug)
    `);

    // 3. Create cosmetics_lines table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cosmetics.cosmetics_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brand_id UUID NOT NULL,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cosmetics_lines_brand_id
      ON cosmetics.cosmetics_lines(brand_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cosmetics_lines_name
      ON cosmetics.cosmetics_lines(name)
    `);

    // 4. Create cosmetics_products table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cosmetics.cosmetics_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brand_id UUID NOT NULL,
        line_id UUID,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        ingredients JSONB,
        status VARCHAR(20) DEFAULT 'draft',
        base_price INT DEFAULT 0,
        sale_price INT,
        currency VARCHAR(10) DEFAULT 'KRW',
        images JSONB,
        variants JSONB,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cosmetics_products_brand_id
      ON cosmetics.cosmetics_products(brand_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cosmetics_products_line_id
      ON cosmetics.cosmetics_products(line_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cosmetics_products_name
      ON cosmetics.cosmetics_products(name)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cosmetics_products_status
      ON cosmetics.cosmetics_products(status)
    `);

    // 5. Create cosmetics_price_policies table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cosmetics.cosmetics_price_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL UNIQUE,
        base_price INT DEFAULT 0,
        sale_price INT,
        sale_start_at TIMESTAMPTZ,
        sale_end_at TIMESTAMPTZ,
        updated_by UUID,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cosmetics_price_policies_product_id
      ON cosmetics.cosmetics_price_policies(product_id)
    `);

    // 6. Create cosmetics_product_logs table (audit log)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cosmetics.cosmetics_product_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        action VARCHAR(20) NOT NULL,
        changes JSONB,
        user_id UUID,
        user_name VARCHAR(200),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cosmetics_product_logs_product_id
      ON cosmetics.cosmetics_product_logs(product_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cosmetics_product_logs_user_id
      ON cosmetics.cosmetics_product_logs(user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cosmetics_product_logs_created_at
      ON cosmetics.cosmetics_product_logs(created_at)
    `);

    // 7. Create cosmetics_price_logs table (audit log)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cosmetics.cosmetics_price_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        action VARCHAR(20) NOT NULL,
        changes JSONB,
        user_id UUID,
        user_name VARCHAR(200),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cosmetics_price_logs_product_id
      ON cosmetics.cosmetics_price_logs(product_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cosmetics_price_logs_user_id
      ON cosmetics.cosmetics_price_logs(user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cosmetics_price_logs_created_at
      ON cosmetics.cosmetics_price_logs(created_at)
    `);

    console.log('[Migration] Cosmetics schema and tables created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS cosmetics.cosmetics_price_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS cosmetics.cosmetics_product_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS cosmetics.cosmetics_price_policies`);
    await queryRunner.query(`DROP TABLE IF EXISTS cosmetics.cosmetics_products`);
    await queryRunner.query(`DROP TABLE IF EXISTS cosmetics.cosmetics_lines`);
    await queryRunner.query(`DROP TABLE IF EXISTS cosmetics.cosmetics_brands`);

    // Drop schema
    await queryRunner.query(`DROP SCHEMA IF EXISTS cosmetics CASCADE`);

    console.log('[Migration] Cosmetics schema and tables dropped');
  }
}
