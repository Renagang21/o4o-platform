import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-LIBRARY-FOUNDATION-V1
 *
 * store_library_items 테이블 생성.
 * 매장 내부 전용 자료실. Neture 연동 없음. HUB 자동 노출 없음.
 */
export class CreateStoreLibraryItems1709303100000 implements MigrationInterface {
  name = 'CreateStoreLibraryItems20260303100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_library_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        file_url TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        category VARCHAR(100),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_store_library_items_store"
        ON store_library_items (store_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_store_library_items_created_at"
        ON store_library_items (created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_library_items_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_library_items_store"`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_library_items`);
  }
}
