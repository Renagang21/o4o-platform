import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-LIBRARY-API-INTEGRATION-V1
 *
 * store_library_items 테이블 생성.
 * 매장 자료실 항목 (Display Domain).
 * Commerce Object가 아니며, Checkout/EcommerceOrder와 연결 금지.
 * Neture FK 금지.
 */
export class CreateStoreLibraryItems1709304100000 implements MigrationInterface {
  name = 'CreateStoreLibraryItems20260304100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_library_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        title VARCHAR(300) NOT NULL,
        description TEXT,
        file_url VARCHAR(1000),
        file_name VARCHAR(500),
        file_size INT,
        mime_type VARCHAR(200),
        category VARCHAR(100),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_store_library_items_org"
        ON store_library_items (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_store_library_items_org_active"
        ON store_library_items (organization_id, is_active)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_library_items_org_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_library_items_org"`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_library_items`);
  }
}
