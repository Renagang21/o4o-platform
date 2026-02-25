import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

/**
 * WO-PRODUCT-POLICY-V2-DATA-LAYER-INTRODUCTION-V1 — Phase 1
 *
 * Creates:
 * - product_approval_type_enum (service, private)
 * - product_approval_status_enum (pending, approved, rejected)
 * - product_approvals table
 *
 * Additive only — no existing tables/columns modified or deleted.
 */
export class CreateProductApprovalsTable20260225100000
  implements MigrationInterface
{
  name = 'CreateProductApprovalsTable20260225100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create ENUM types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "product_approval_type_enum"
          AS ENUM ('service', 'private');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "product_approval_status_enum"
          AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create table (skip if exists)
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'product_approvals'
      );
    `);

    if (!tableExists[0]?.exists) {
      await queryRunner.createTable(
        new Table({
          name: 'product_approvals',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'gen_random_uuid()',
            },
            { name: 'product_id', type: 'uuid', isNullable: false },
            { name: 'organization_id', type: 'uuid', isNullable: false },
            {
              name: 'service_key',
              type: 'varchar',
              length: '50',
              isNullable: false,
              default: `'kpa'`,
            },
            {
              name: 'approval_type',
              type: 'enum',
              enum: ['service', 'private'],
              enumName: 'product_approval_type_enum',
              default: `'service'`,
            },
            {
              name: 'approval_status',
              type: 'enum',
              enum: ['pending', 'approved', 'rejected'],
              enumName: 'product_approval_status_enum',
              default: `'pending'`,
            },
            { name: 'requested_by', type: 'uuid', isNullable: true },
            { name: 'decided_by', type: 'uuid', isNullable: true },
            { name: 'decided_at', type: 'timestamp', isNullable: true },
            { name: 'reason', type: 'text', isNullable: true },
            {
              name: 'metadata',
              type: 'jsonb',
              isNullable: false,
              default: `'{}'`,
            },
            { name: 'created_at', type: 'timestamp', default: 'NOW()' },
            { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
          ],
        }),
        true,
      );

      // 3. Foreign key → neture_supplier_products
      await queryRunner.createForeignKey(
        'product_approvals',
        new TableForeignKey({
          name: 'FK_product_approvals_product',
          columnNames: ['product_id'],
          referencedTableName: 'neture_supplier_products',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );

      // 4. Indexes
      await queryRunner.createIndex(
        'product_approvals',
        new TableIndex({
          name: 'IDX_product_approvals_product',
          columnNames: ['product_id'],
        }),
      );

      await queryRunner.createIndex(
        'product_approvals',
        new TableIndex({
          name: 'IDX_product_approvals_org',
          columnNames: ['organization_id'],
        }),
      );

      await queryRunner.createIndex(
        'product_approvals',
        new TableIndex({
          name: 'IDX_product_approvals_status',
          columnNames: ['approval_status'],
        }),
      );

      await queryRunner.createIndex(
        'product_approvals',
        new TableIndex({
          name: 'IDX_product_approvals_service_key',
          columnNames: ['service_key'],
        }),
      );

      // 5. Unique constraint: same org + product + type → one approval only
      await queryRunner.createUniqueConstraint(
        'product_approvals',
        new TableUnique({
          name: 'UQ_product_approvals_product_org',
          columnNames: ['product_id', 'organization_id', 'approval_type'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('product_approvals', true);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "product_approval_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "product_approval_type_enum"`,
    );
  }
}
