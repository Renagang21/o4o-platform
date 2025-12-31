/**
 * CreateNetureTables Migration
 *
 * Phase D-1: Neture API Server 골격 구축
 * Creates Neture schema and tables
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNetureTables1735567200000 implements MigrationInterface {
  name = 'CreateNetureTables1735567200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create neture schema
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS neture`);

    // Create neture_partners table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS neture.neture_partners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        business_name VARCHAR(200),
        business_number VARCHAR(50),
        type VARCHAR(20) NOT NULL DEFAULT 'partner',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        description TEXT,
        logo VARCHAR(500),
        website VARCHAR(255),
        contact JSONB,
        address JSONB,
        metadata JSONB,
        user_id UUID,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes for partners
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_neture_partners_name ON neture.neture_partners(name)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_neture_partners_business_number ON neture.neture_partners(business_number)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_neture_partners_type ON neture.neture_partners(type)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_neture_partners_status ON neture.neture_partners(status)`);

    // Create neture_products table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS neture.neture_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID REFERENCES neture.neture_partners(id) ON DELETE SET NULL,
        name VARCHAR(200) NOT NULL,
        subtitle VARCHAR(500),
        description TEXT,
        category VARCHAR(30) NOT NULL DEFAULT 'other',
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        base_price INTEGER NOT NULL DEFAULT 0,
        sale_price INTEGER,
        currency VARCHAR(10) NOT NULL DEFAULT 'KRW',
        stock INTEGER NOT NULL DEFAULT 0,
        sku VARCHAR(100),
        images JSONB,
        tags JSONB,
        metadata JSONB,
        is_featured BOOLEAN NOT NULL DEFAULT FALSE,
        view_count INTEGER NOT NULL DEFAULT 0,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes for products
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_neture_products_partner_id ON neture.neture_products(partner_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_neture_products_name ON neture.neture_products(name)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_neture_products_category ON neture.neture_products(category)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_neture_products_status ON neture.neture_products(status)`);

    // Create neture_product_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS neture.neture_product_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        action VARCHAR(30) NOT NULL,
        before JSONB,
        after JSONB,
        note TEXT,
        performed_by UUID,
        ip_address VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes for logs
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_neture_product_logs_product_id ON neture.neture_product_logs(product_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_neture_product_logs_action ON neture.neture_product_logs(action)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS neture.neture_product_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS neture.neture_products`);
    await queryRunner.query(`DROP TABLE IF EXISTS neture.neture_partners`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS neture CASCADE`);
  }
}
