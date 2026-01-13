import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Phase 3-P0: Neture Domain Tables Migration
 *
 * Creates the following tables:
 * - neture_suppliers (공급자 정보)
 * - neture_supplier_products (공급자 상품)
 * - neture_partnership_requests (파트너십 요청)
 * - neture_partnership_products (파트너십 상품)
 *
 * Entity definitions are already registered in connection.ts.
 * This migration creates the actual database tables.
 */
export class CreateNetureTables1736950000000 implements MigrationInterface {
  name = 'CreateNetureTables1736950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // 1. Create ENUM types for PostgreSQL
    // ============================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "neture_supplier_status_enum" AS ENUM ('ACTIVE', 'INACTIVE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "neture_partnership_status_enum" AS ENUM ('OPEN', 'MATCHED', 'CLOSED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // ============================================================================
    // 2. Create neture_suppliers table
    // ============================================================================
    await queryRunner.createTable(
      new Table({
        name: 'neture_suppliers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'slug',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'logo_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'short_description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'pricing_policy',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'moq',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'shipping_standard',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'shipping_island',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'shipping_mountain',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'contact_email',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'contact_phone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'contact_website',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'contact_kakao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'neture_supplier_status_enum',
            default: "'ACTIVE'",
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
      true,
    );

    // ============================================================================
    // 3. Create neture_supplier_products table
    // ============================================================================
    await queryRunner.createTable(
      new Table({
        name: 'neture_supplier_products',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'supplier_id',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'category',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add FK: neture_supplier_products.supplier_id -> neture_suppliers.id
    await queryRunner.createForeignKey(
      'neture_supplier_products',
      new TableForeignKey({
        columnNames: ['supplier_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'neture_suppliers',
        onDelete: 'CASCADE',
      }),
    );

    // ============================================================================
    // 4. Create neture_partnership_requests table
    // ============================================================================
    await queryRunner.createTable(
      new Table({
        name: 'neture_partnership_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'seller_id',
            type: 'varchar',
          },
          {
            name: 'seller_name',
            type: 'varchar',
          },
          {
            name: 'seller_service_type',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'seller_store_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'product_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'period_start',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'period_end',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'revenue_structure',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'neture_partnership_status_enum',
            default: "'OPEN'",
          },
          {
            name: 'promotion_sns',
            type: 'boolean',
            default: false,
          },
          {
            name: 'promotion_content',
            type: 'boolean',
            default: false,
          },
          {
            name: 'promotion_banner',
            type: 'boolean',
            default: false,
          },
          {
            name: 'promotion_other',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'contact_email',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'contact_phone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'contact_kakao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'matched_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // ============================================================================
    // 5. Create neture_partnership_products table
    // ============================================================================
    await queryRunner.createTable(
      new Table({
        name: 'neture_partnership_products',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'partnership_request_id',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'category',
            type: 'varchar',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Add FK: neture_partnership_products.partnership_request_id -> neture_partnership_requests.id
    await queryRunner.createForeignKey(
      'neture_partnership_products',
      new TableForeignKey({
        columnNames: ['partnership_request_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'neture_partnership_requests',
        onDelete: 'CASCADE',
      }),
    );

    // ============================================================================
    // 6. Create indexes for performance
    // ============================================================================
    await queryRunner.createIndex(
      'neture_suppliers',
      new TableIndex({
        name: 'IDX_neture_suppliers_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'neture_suppliers',
      new TableIndex({
        name: 'IDX_neture_suppliers_category',
        columnNames: ['category'],
      }),
    );

    await queryRunner.createIndex(
      'neture_supplier_products',
      new TableIndex({
        name: 'IDX_neture_supplier_products_supplier_id',
        columnNames: ['supplier_id'],
      }),
    );

    await queryRunner.createIndex(
      'neture_partnership_requests',
      new TableIndex({
        name: 'IDX_neture_partnership_requests_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'neture_partnership_products',
      new TableIndex({
        name: 'IDX_neture_partnership_products_request_id',
        columnNames: ['partnership_request_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (child tables first)
    await queryRunner.dropTable('neture_partnership_products', true);
    await queryRunner.dropTable('neture_partnership_requests', true);
    await queryRunner.dropTable('neture_supplier_products', true);
    await queryRunner.dropTable('neture_suppliers', true);

    // Drop ENUM types
    await queryRunner.query(`DROP TYPE IF EXISTS "neture_partnership_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "neture_supplier_status_enum"`);
  }
}
