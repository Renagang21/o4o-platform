/**
 * Migration: Create Glycopharm Featured Products Table
 *
 * WO-FEATURED-CURATION-API-V1:
 * 운영자 큐레이션 데이터를 위한 독립 테이블 생성
 *
 * 핵심:
 * - 상품 엔티티와 분리된 큐레이션 데이터
 * - (service, context, product_id) 유니크 제약
 * - position을 통한 정렬 관리
 */

import { type MigrationInterface, type QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateGlycopharmFeaturedProducts1738296000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'glycopharm_featured_products',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'service',
            type: 'varchar',
            length: '50',
            default: "'glycopharm'",
          },
          {
            name: 'context',
            type: 'varchar',
            length: '100',
            default: "'store-home'",
          },
          {
            name: 'product_id',
            type: 'uuid',
          },
          {
            name: 'position',
            type: 'int',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_by_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_by_user_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Unique constraint: (service, context, product_id)
    await queryRunner.createIndex(
      'glycopharm_featured_products',
      new TableIndex({
        name: 'IDX_glycopharm_featured_unique',
        columnNames: ['service', 'context', 'product_id'],
        isUnique: true,
      })
    );

    // Index for ordering: (service, context, position)
    await queryRunner.createIndex(
      'glycopharm_featured_products',
      new TableIndex({
        name: 'IDX_glycopharm_featured_order',
        columnNames: ['service', 'context', 'position'],
      })
    );

    // Foreign key to glycopharm_products
    await queryRunner.query(`
      ALTER TABLE glycopharm_featured_products
      ADD CONSTRAINT FK_glycopharm_featured_product
      FOREIGN KEY (product_id)
      REFERENCES glycopharm_products(id)
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('glycopharm_featured_products');
  }
}
