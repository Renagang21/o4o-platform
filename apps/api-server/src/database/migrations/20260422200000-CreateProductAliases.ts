import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-ALIAS-FOUNDATION-V1
 *
 * product_aliases 테이블 생성
 * - product_master_id + normalized_alias unique 제약
 * - 검색 성능을 위한 인덱스
 */
export class CreateProductAliases1745290800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE product_alias_source_enum AS ENUM ('search', 'bulk', 'manual', 'import')
    `);

    await queryRunner.query(`
      CREATE TABLE product_aliases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_master_id UUID NOT NULL REFERENCES product_masters(id) ON DELETE CASCADE,
        alias VARCHAR(255) NOT NULL,
        normalized_alias VARCHAR(255) NOT NULL,
        source product_alias_source_enum NOT NULL DEFAULT 'search',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_product_alias
        ON product_aliases (product_master_id, normalized_alias)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_product_alias_normalized
        ON product_aliases (normalized_alias)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_product_alias_master
        ON product_aliases (product_master_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS product_aliases`);
    await queryRunner.query(`DROP TYPE IF EXISTS product_alias_source_enum`);
  }
}
