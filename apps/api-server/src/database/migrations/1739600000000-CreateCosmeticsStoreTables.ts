/**
 * Migration: Create Cosmetics Store Tables
 *
 * WO-KCOS-STORES-PHASE1-V1: K-Cosmetics Store Core Phase 1
 *
 * Creates 4 tables in the cosmetics schema:
 * - cosmetics_stores
 * - cosmetics_store_applications
 * - cosmetics_store_members
 * - cosmetics_store_listings
 */

import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateCosmeticsStoreTables1739600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure cosmetics schema exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS cosmetics`);

    // 1. cosmetics_stores
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cosmetics.cosmetics_stores (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(200) NOT NULL,
        code VARCHAR(100) NOT NULL UNIQUE,
        business_number VARCHAR(100) NOT NULL UNIQUE,
        owner_name VARCHAR(200) NOT NULL,
        contact_phone VARCHAR(50),
        address TEXT,
        region VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_cs_name ON cosmetics.cosmetics_stores (name)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_cs_region ON cosmetics.cosmetics_stores (region)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_cs_status ON cosmetics.cosmetics_stores (status)`);

    // 2. cosmetics_store_applications
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cosmetics.cosmetics_store_applications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        applicant_user_id UUID NOT NULL,
        store_name VARCHAR(200) NOT NULL,
        business_number VARCHAR(100) NOT NULL,
        owner_name VARCHAR(200) NOT NULL,
        contact_phone VARCHAR(50),
        address TEXT,
        region VARCHAR(100),
        note TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        rejection_reason TEXT,
        reviewed_by UUID,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_csa_applicant ON cosmetics.cosmetics_store_applications (applicant_user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_csa_status ON cosmetics.cosmetics_store_applications (status)`);

    // 3. cosmetics_store_members
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cosmetics.cosmetics_store_members (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        store_id UUID NOT NULL,
        user_id UUID NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'staff',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT UQ_csm_store_user UNIQUE (store_id, user_id),
        CONSTRAINT FK_csm_store FOREIGN KEY (store_id)
          REFERENCES cosmetics.cosmetics_stores(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_csm_store_id ON cosmetics.cosmetics_store_members (store_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_csm_user_id ON cosmetics.cosmetics_store_members (user_id)`);

    // 4. cosmetics_store_listings
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cosmetics.cosmetics_store_listings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        store_id UUID NOT NULL,
        product_id UUID NOT NULL,
        price_override INT,
        is_visible BOOLEAN NOT NULL DEFAULT true,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT UQ_csl_store_product UNIQUE (store_id, product_id),
        CONSTRAINT FK_csl_store FOREIGN KEY (store_id)
          REFERENCES cosmetics.cosmetics_stores(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_csl_store_id ON cosmetics.cosmetics_store_listings (store_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_csl_product_id ON cosmetics.cosmetics_store_listings (product_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cosmetics.cosmetics_store_listings`);
    await queryRunner.query(`DROP TABLE IF EXISTS cosmetics.cosmetics_store_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS cosmetics.cosmetics_store_applications`);
    await queryRunner.query(`DROP TABLE IF EXISTS cosmetics.cosmetics_stores`);
  }
}
