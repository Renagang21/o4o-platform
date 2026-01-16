import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * WO-NETURE-SUPPLIER-DASHBOARD-P1
 *
 * Creates missing tables for supplier dashboard functionality:
 * - neture_supplier_requests: 판매자 → 공급자 신청 관리
 * - neture_supplier_contents: 공급자 콘텐츠 관리
 * - neture_supplier_request_events: 신청 이벤트 로그 (감사 추적)
 *
 * Also adds missing columns to neture_supplier_products table.
 */
export class CreateNetureSupplierDashboardTables1737200000000 implements MigrationInterface {
  name = 'CreateNetureSupplierDashboardTables1737200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[CreateNetureSupplierDashboardTables] Starting migration...');

    // ============================================================================
    // 1. Create ENUM types
    // ============================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "neture_supplier_request_status_enum" AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "neture_content_type_enum" AS ENUM ('description', 'image', 'banner', 'guide');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "neture_content_status_enum" AS ENUM ('draft', 'published');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "neture_request_event_type_enum" AS ENUM ('created', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('[CreateNetureSupplierDashboardTables] Created ENUM types');

    // ============================================================================
    // 2. Create neture_supplier_requests table
    // ============================================================================
    const requestsTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'neture_supplier_requests'
      );
    `);

    if (!requestsTableExists[0]?.exists) {
      await queryRunner.createTable(
        new Table({
          name: 'neture_supplier_requests',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            { name: 'supplier_id', type: 'varchar' },
            { name: 'supplier_name', type: 'varchar', isNullable: true },
            { name: 'seller_id', type: 'varchar' },
            { name: 'seller_name', type: 'varchar' },
            { name: 'seller_email', type: 'varchar', isNullable: true },
            { name: 'seller_phone', type: 'varchar', isNullable: true },
            { name: 'seller_store_url', type: 'text', isNullable: true },
            { name: 'service_id', type: 'varchar' },
            { name: 'service_name', type: 'varchar' },
            { name: 'product_id', type: 'varchar' },
            { name: 'product_name', type: 'varchar' },
            { name: 'product_category', type: 'varchar', isNullable: true },
            { name: 'product_purpose', type: 'varchar', isNullable: true },
            {
              name: 'status',
              type: 'neture_supplier_request_status_enum',
              default: "'pending'",
            },
            { name: 'decided_by', type: 'varchar', isNullable: true },
            { name: 'decided_at', type: 'timestamp', isNullable: true },
            { name: 'reject_reason', type: 'text', isNullable: true },
            { name: 'metadata', type: 'jsonb', isNullable: true },
            { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          ],
        }),
        true,
      );

      await queryRunner.createIndex(
        'neture_supplier_requests',
        new TableIndex({
          name: 'IDX_neture_supplier_requests_supplier_id',
          columnNames: ['supplier_id'],
        }),
      );

      await queryRunner.createIndex(
        'neture_supplier_requests',
        new TableIndex({
          name: 'IDX_neture_supplier_requests_status',
          columnNames: ['status'],
        }),
      );

      await queryRunner.createIndex(
        'neture_supplier_requests',
        new TableIndex({
          name: 'IDX_neture_supplier_requests_service_id',
          columnNames: ['service_id'],
        }),
      );

      console.log('[CreateNetureSupplierDashboardTables] Created neture_supplier_requests table');
    }

    // ============================================================================
    // 3. Create neture_supplier_contents table
    // ============================================================================
    const contentsTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'neture_supplier_contents'
      );
    `);

    if (!contentsTableExists[0]?.exists) {
      await queryRunner.createTable(
        new Table({
          name: 'neture_supplier_contents',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            { name: 'supplier_id', type: 'uuid' },
            {
              name: 'type',
              type: 'neture_content_type_enum',
              default: "'description'",
            },
            { name: 'title', type: 'varchar' },
            { name: 'description', type: 'text', isNullable: true },
            { name: 'body', type: 'text', isNullable: true },
            { name: 'image_url', type: 'text', isNullable: true },
            {
              name: 'status',
              type: 'neture_content_status_enum',
              default: "'draft'",
            },
            { name: 'available_services', type: 'text', isNullable: true },
            { name: 'available_areas', type: 'text', isNullable: true },
            { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            { name: 'published_at', type: 'timestamp', isNullable: true },
          ],
        }),
        true,
      );

      await queryRunner.createForeignKey(
        'neture_supplier_contents',
        new TableForeignKey({
          columnNames: ['supplier_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'neture_suppliers',
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createIndex(
        'neture_supplier_contents',
        new TableIndex({
          name: 'IDX_neture_supplier_contents_supplier_id',
          columnNames: ['supplier_id'],
        }),
      );

      console.log('[CreateNetureSupplierDashboardTables] Created neture_supplier_contents table');
    }

    // ============================================================================
    // 4. Create neture_supplier_request_events table
    // ============================================================================
    const eventsTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'neture_supplier_request_events'
      );
    `);

    if (!eventsTableExists[0]?.exists) {
      await queryRunner.createTable(
        new Table({
          name: 'neture_supplier_request_events',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            { name: 'request_id', type: 'varchar' },
            {
              name: 'event_type',
              type: 'neture_request_event_type_enum',
            },
            { name: 'actor_id', type: 'varchar' },
            { name: 'actor_name', type: 'varchar', isNullable: true },
            { name: 'seller_id', type: 'varchar' },
            { name: 'seller_name', type: 'varchar' },
            { name: 'product_id', type: 'varchar' },
            { name: 'product_name', type: 'varchar' },
            { name: 'service_id', type: 'varchar' },
            { name: 'service_name', type: 'varchar' },
            { name: 'from_status', type: 'varchar', isNullable: true },
            { name: 'to_status', type: 'varchar' },
            { name: 'reason', type: 'text', isNullable: true },
            { name: 'metadata', type: 'jsonb', isNullable: true },
            { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          ],
        }),
        true,
      );

      await queryRunner.createIndex(
        'neture_supplier_request_events',
        new TableIndex({
          name: 'IDX_neture_supplier_request_events_request_id',
          columnNames: ['request_id'],
        }),
      );

      await queryRunner.createIndex(
        'neture_supplier_request_events',
        new TableIndex({
          name: 'IDX_neture_supplier_request_events_actor_id',
          columnNames: ['actor_id'],
        }),
      );

      console.log('[CreateNetureSupplierDashboardTables] Created neture_supplier_request_events table');
    }

    // ============================================================================
    // 5. Add missing columns to neture_supplier_products
    // ============================================================================
    const purposeColumnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'neture_supplier_products' AND column_name = 'purpose'
      );
    `);

    if (!purposeColumnExists[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE neture_supplier_products
        ADD COLUMN IF NOT EXISTS purpose varchar DEFAULT 'CATALOG',
        ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
        ADD COLUMN IF NOT EXISTS accepts_applications boolean DEFAULT true,
        ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      `);

      console.log('[CreateNetureSupplierDashboardTables] Added columns to neture_supplier_products');
    }

    console.log('[CreateNetureSupplierDashboardTables] === Migration Complete ===');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.dropTable('neture_supplier_request_events', true);
    await queryRunner.dropTable('neture_supplier_contents', true);
    await queryRunner.dropTable('neture_supplier_requests', true);

    // Remove added columns from neture_supplier_products
    await queryRunner.query(`
      ALTER TABLE neture_supplier_products
      DROP COLUMN IF EXISTS purpose,
      DROP COLUMN IF EXISTS is_active,
      DROP COLUMN IF EXISTS accepts_applications,
      DROP COLUMN IF EXISTS updated_at
    `);

    // Drop ENUM types
    await queryRunner.query(`DROP TYPE IF EXISTS neture_request_event_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS neture_content_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS neture_content_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS neture_supplier_request_status_enum`);
  }
}
