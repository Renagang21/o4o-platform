import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-LIBRARY-FOUNDATION-V1
 *
 * store_library_items 테이블 생성.
 *
 * NOTE: 테이블은 WO-O4O-STORE-LIBRARY-API-INTEGRATION-V1에서
 * TypeORM synchronize로 이미 생성됨 (organization_id 스키마).
 * 이 마이그레이션은 테이블 부재 시에만 생성하며,
 * 이미 존재하면 안전하게 스킵한다.
 */
export class CreateStoreLibraryItems1709303100000 implements MigrationInterface {
  name = 'CreateStoreLibraryItems20260303100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 테이블이 이미 존재하는지 확인
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'store_library_items'
      ) AS exists
    `);

    if (tableExists[0]?.exists) {
      console.info('[CreateStoreLibraryItems] Table already exists — skipping creation');
      return;
    }

    // 테이블이 없는 경우에만 생성 (organization_id 스키마)
    await queryRunner.query(`
      CREATE TABLE store_library_items (
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
      CREATE INDEX "IDX_store_library_items_org"
        ON store_library_items (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_store_library_items_org_active"
        ON store_library_items (organization_id, is_active)
    `);

    console.info('[CreateStoreLibraryItems] Table created with organization_id schema');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_library_items_org_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_library_items_org"`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_library_items`);
  }
}
