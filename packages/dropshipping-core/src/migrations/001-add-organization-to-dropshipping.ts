import { MigrationInterface, QueryRunner, TableColumn, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Add Organization Support to Dropshipping
 *
 * Adds organizationId columns to Product and Settlement entities
 * to enable organization-scoped dropshipping and groupbuys.
 *
 * @version 1.0.0
 * @date 2025-11-30
 */
export class AddOrganizationToDropshipping1701345000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Add organizationId to products
    // ============================================
    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'scope',
        type: 'varchar',
        length: '20',
        default: "'global'",
      })
    );

    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'organizationPricing',
        type: 'jsonb',
        isNullable: true,
      })
    );

    // Add index for organization-based filtering
    await queryRunner.createIndex(
      'products',
      new TableIndex({
        name: 'IDX_products_organization_scope',
        columnNames: ['organizationId', 'scope', 'status'],
      })
    );

    // Add foreign key to organization table
    await queryRunner.createForeignKey(
      'products',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organization',
        onDelete: 'SET NULL',
      })
    );

    // ============================================
    // 2. Add organizationId to settlements
    // ============================================
    await queryRunner.addColumn(
      'settlements',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: true,
      })
    );

    // Add index for organization-based filtering
    await queryRunner.createIndex(
      'settlements',
      new TableIndex({
        name: 'IDX_settlements_organization',
        columnNames: ['organizationId'],
      })
    );

    // Add foreign key to organization table
    await queryRunner.createForeignKey(
      'settlements',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organization',
        onDelete: 'SET NULL',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Rollback settlements changes
    // ============================================
    // Drop foreign key
    const settlementsTable = await queryRunner.getTable('settlements');
    const settlementsOrgFk = settlementsTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('organizationId') !== -1
    );
    if (settlementsOrgFk) {
      await queryRunner.dropForeignKey('settlements', settlementsOrgFk);
    }

    // Drop index
    await queryRunner.dropIndex('settlements', 'IDX_settlements_organization');

    // Drop column
    await queryRunner.dropColumn('settlements', 'organizationId');

    // ============================================
    // 2. Rollback products changes
    // ============================================
    // Drop foreign key
    const productsTable = await queryRunner.getTable('products');
    const productsOrgFk = productsTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('organizationId') !== -1
    );
    if (productsOrgFk) {
      await queryRunner.dropForeignKey('products', productsOrgFk);
    }

    // Drop index
    await queryRunner.dropIndex('products', 'IDX_products_organization_scope');

    // Drop columns
    await queryRunner.dropColumn('products', 'organizationPricing');
    await queryRunner.dropColumn('products', 'scope');
    await queryRunner.dropColumn('products', 'organizationId');
  }
}
