import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-NETURE-LIBRARY-FOUNDATION-V1
 *
 * Creates neture_supplier_library_items table
 * 공급자 전용 자료실 — 외부 URL 기반 파일 관리
 */
export class CreateNetureSupplierLibraryItems20260303100000 implements MigrationInterface {
  name = 'CreateNetureSupplierLibraryItems20260303100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE neture_supplier_library_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        supplier_id UUID NOT NULL
          REFERENCES neture_suppliers(id) ON DELETE CASCADE,

        title VARCHAR(200) NOT NULL,
        description TEXT,

        file_url TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,

        category VARCHAR(100),
        is_public BOOLEAN NOT NULL DEFAULT false,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_nsli_supplier_id
        ON neture_supplier_library_items (supplier_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_nsli_created_at
        ON neture_supplier_library_items (created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_nsli_is_public
        ON neture_supplier_library_items (is_public)
        WHERE is_public = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS neture_supplier_library_items CASCADE`);
  }
}
