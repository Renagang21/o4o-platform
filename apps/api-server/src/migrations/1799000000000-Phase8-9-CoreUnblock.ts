import { MigrationInterface, QueryRunner, TableColumn, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Phase 8/9 Core Unblock Migration
 *
 * Phase 8: Supplier Policy Integration
 * - Add policyId to suppliers (commission policy linkage)
 * - Add policyId to products (commission policy override)
 * - Add settlementCycleDays to suppliers
 *
 * Phase 9: Seller Authorization System
 * - Create seller_authorizations table (approval workflow)
 *
 * Zero-Data Safe: All columns nullable, no breaking changes
 * Created: 2025-01-07
 */
export class Phase89CoreUnblock1799000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // Phase 8: Supplier Policy Columns
    // ========================================

    // Add policyId to suppliers
    await queryRunner.addColumn('suppliers', new TableColumn({
      name: 'policyId',
      type: 'uuid',
      isNullable: true,
      comment: 'Phase 8: FK to commission_policies for supplier-level commission'
    }));

    // Add settlementCycleDays to suppliers
    await queryRunner.addColumn('suppliers', new TableColumn({
      name: 'settlementCycleDays',
      type: 'integer',
      isNullable: true,
      comment: 'Phase 8: Settlement cycle in days (e.g., 30 = monthly settlement)'
    }));

    // Add foreign key for suppliers.policyId
    await queryRunner.createForeignKey('suppliers', new TableForeignKey({
      columnNames: ['policyId'],
      referencedTableName: 'commission_policies',
      referencedColumnNames: ['id'],
      onDelete: 'SET NULL',
      name: 'fk_suppliers_policy'
    }));

    // Add partial index for suppliers with policies
    await queryRunner.createIndex('suppliers', new TableIndex({
      name: 'idx_suppliers_policy_id',
      columnNames: ['policyId'],
      where: '"policyId" IS NOT NULL'
    }));

    // ========================================
    // Phase 8: Product Policy Column
    // ========================================

    // Add policyId to products
    await queryRunner.addColumn('products', new TableColumn({
      name: 'policyId',
      type: 'uuid',
      isNullable: true,
      comment: 'Phase 8: FK to commission_policies for product-level commission override'
    }));

    // Add foreign key for products.policyId
    await queryRunner.createForeignKey('products', new TableForeignKey({
      columnNames: ['policyId'],
      referencedTableName: 'commission_policies',
      referencedColumnNames: ['id'],
      onDelete: 'SET NULL',
      name: 'fk_products_policy'
    }));

    // Add partial index for products with policy overrides
    await queryRunner.createIndex('products', new TableIndex({
      name: 'idx_products_policy_id',
      columnNames: ['policyId'],
      where: '"policyId" IS NOT NULL'
    }));

    // ========================================
    // Phase 9: Seller Authorizations Table
    // ========================================

    await queryRunner.createTable(new Table({
      name: 'seller_authorizations',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          generationStrategy: 'uuid',
          default: 'uuid_generate_v4()'
        },
        {
          name: 'sellerId',
          type: 'uuid',
          isNullable: false,
          comment: 'FK to sellers table'
        },
        {
          name: 'supplierId',
          type: 'uuid',
          isNullable: false,
          comment: 'FK to suppliers table - which supplier to access'
        },
        {
          name: 'status',
          type: 'varchar',
          length: '20',
          default: "'pending'",
          comment: 'pending | approved | rejected | blocked'
        },
        {
          name: 'requestedAt',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false
        },
        {
          name: 'approvedAt',
          type: 'timestamp',
          isNullable: true
        },
        {
          name: 'approvedBy',
          type: 'uuid',
          isNullable: true,
          comment: 'Admin user ID who approved'
        },
        {
          name: 'rejectedAt',
          type: 'timestamp',
          isNullable: true
        },
        {
          name: 'rejectedBy',
          type: 'uuid',
          isNullable: true,
          comment: 'Admin user ID who rejected'
        },
        {
          name: 'rejectionReason',
          type: 'text',
          isNullable: true
        },
        {
          name: 'blockedAt',
          type: 'timestamp',
          isNullable: true
        },
        {
          name: 'blockedBy',
          type: 'uuid',
          isNullable: true,
          comment: 'Admin user ID who blocked'
        },
        {
          name: 'blockReason',
          type: 'text',
          isNullable: true
        },
        {
          name: 'cooldownUntil',
          type: 'timestamp',
          isNullable: true,
          comment: '30-day cooldown after rejection'
        },
        {
          name: 'metadata',
          type: 'jsonb',
          isNullable: true,
          comment: 'Additional data (application details, etc.)'
        },
        {
          name: 'createdAt',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false
        },
        {
          name: 'updatedAt',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false
        }
      ]
    }), true);

    // Add foreign keys for seller_authorizations
    await queryRunner.createForeignKey('seller_authorizations', new TableForeignKey({
      columnNames: ['sellerId'],
      referencedTableName: 'sellers',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      name: 'fk_seller_authorizations_seller'
    }));

    await queryRunner.createForeignKey('seller_authorizations', new TableForeignKey({
      columnNames: ['supplierId'],
      referencedTableName: 'suppliers',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      name: 'fk_seller_authorizations_supplier'
    }));

    // Add indexes for seller_authorizations
    await queryRunner.createIndex('seller_authorizations', new TableIndex({
      name: 'idx_seller_authorizations_seller_supplier',
      columnNames: ['sellerId', 'supplierId'],
      isUnique: true,
      where: 'status != \'blocked\''
    }));

    await queryRunner.createIndex('seller_authorizations', new TableIndex({
      name: 'idx_seller_authorizations_status',
      columnNames: ['status', 'requestedAt']
    }));

    await queryRunner.createIndex('seller_authorizations', new TableIndex({
      name: 'idx_seller_authorizations_cooldown',
      columnNames: ['sellerId', 'cooldownUntil'],
      where: '"cooldownUntil" IS NOT NULL'
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // Rollback Phase 9
    // ========================================

    // Drop seller_authorizations indexes
    await queryRunner.dropIndex('seller_authorizations', 'idx_seller_authorizations_cooldown');
    await queryRunner.dropIndex('seller_authorizations', 'idx_seller_authorizations_status');
    await queryRunner.dropIndex('seller_authorizations', 'idx_seller_authorizations_seller_supplier');

    // Drop seller_authorizations foreign keys
    await queryRunner.dropForeignKey('seller_authorizations', 'fk_seller_authorizations_supplier');
    await queryRunner.dropForeignKey('seller_authorizations', 'fk_seller_authorizations_seller');

    // Drop seller_authorizations table
    await queryRunner.dropTable('seller_authorizations');

    // ========================================
    // Rollback Phase 8 - Products
    // ========================================

    await queryRunner.dropIndex('products', 'idx_products_policy_id');
    await queryRunner.dropForeignKey('products', 'fk_products_policy');
    await queryRunner.dropColumn('products', 'policyId');

    // ========================================
    // Rollback Phase 8 - Suppliers
    // ========================================

    await queryRunner.dropIndex('suppliers', 'idx_suppliers_policy_id');
    await queryRunner.dropForeignKey('suppliers', 'fk_suppliers_policy');
    await queryRunner.dropColumn('suppliers', 'settlementCycleDays');
    await queryRunner.dropColumn('suppliers', 'policyId');
  }
}
