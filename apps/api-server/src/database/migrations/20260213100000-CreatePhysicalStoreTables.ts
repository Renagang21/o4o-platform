/**
 * CreatePhysicalStoreTables
 *
 * WO-O4O-CROSS-SERVICE-STORE-LINKING-V1
 *
 * Creates physical_stores and physical_store_links tables for
 * cross-service store linking by business_number.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePhysicalStoreTables20260213100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Physical stores — one row per unique normalized business number
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS physical_stores (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_number VARCHAR(20) NOT NULL UNIQUE,
        store_name VARCHAR(255) NOT NULL,
        region VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_ps_business_number ON physical_stores (business_number)`,
    );

    // 2. Links — maps physical store to service-specific stores
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS physical_store_links (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        physical_store_id UUID NOT NULL REFERENCES physical_stores(id) ON DELETE CASCADE,
        service_type VARCHAR(20) NOT NULL,
        service_store_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(service_type, service_store_id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_psl_physical_store ON physical_store_links (physical_store_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_psl_service ON physical_store_links (service_type, service_store_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS physical_store_links`);
    await queryRunner.query(`DROP TABLE IF EXISTS physical_stores`);
  }
}
