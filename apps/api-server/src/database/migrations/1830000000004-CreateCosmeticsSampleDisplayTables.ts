import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Create Cosmetics Sample Display Extension Tables
 *
 * Tables:
 * - cosmetics_sample_inventory: 샘플 재고 관리
 * - cosmetics_sample_usage_logs: 샘플 사용 로그
 * - cosmetics_sample_conversion: 샘플 → 구매 전환 추적
 * - cosmetics_display_layouts: 진열 레이아웃 관리
 */
export class CreateCosmeticsSampleDisplayTables1830000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. cosmetics_sample_inventory
    await queryRunner.createTable(
      new Table({
        name: 'cosmetics_sample_inventory',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'storeId', type: 'uuid' },
          { name: 'productId', type: 'uuid' },
          { name: 'supplierId', type: 'uuid', isNullable: true },
          { name: 'productName', type: 'varchar', length: '255' },
          { name: 'sampleType', type: 'varchar', length: '50', default: "'trial'" },
          { name: 'quantityReceived', type: 'int', default: 0 },
          { name: 'quantityUsed', type: 'int', default: 0 },
          { name: 'quantityRemaining', type: 'int', default: 0 },
          { name: 'minimumStock', type: 'int', default: 10 },
          { name: 'status', type: 'varchar', length: '50', default: "'in_stock'" },
          { name: 'lastRefilledAt', type: 'timestamp', isNullable: true },
          { name: 'lastUsedAt', type: 'timestamp', isNullable: true },
          { name: 'expiryDate', type: 'timestamp', isNullable: true },
          { name: 'batchNumber', type: 'varchar', length: '100', isNullable: true },
          { name: 'unitCost', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'cosmetics_sample_inventory',
      new TableIndex({
        name: 'IDX_cosmetics_sample_inventory_store_product',
        columnNames: ['storeId', 'productId'],
        isUnique: true,
      })
    );
    await queryRunner.createIndex(
      'cosmetics_sample_inventory',
      new TableIndex({
        name: 'IDX_cosmetics_sample_inventory_storeId',
        columnNames: ['storeId'],
      })
    );
    await queryRunner.createIndex(
      'cosmetics_sample_inventory',
      new TableIndex({
        name: 'IDX_cosmetics_sample_inventory_productId',
        columnNames: ['productId'],
      })
    );

    // 2. cosmetics_sample_usage_logs
    await queryRunner.createTable(
      new Table({
        name: 'cosmetics_sample_usage_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'inventoryId', type: 'uuid' },
          { name: 'storeId', type: 'uuid' },
          { name: 'productId', type: 'uuid' },
          { name: 'customerId', type: 'uuid', isNullable: true },
          { name: 'staffId', type: 'uuid', isNullable: true },
          { name: 'usageType', type: 'varchar', length: '50', default: "'customer_trial'" },
          { name: 'quantity', type: 'int', default: 1 },
          { name: 'feedback', type: 'text', isNullable: true },
          { name: 'rating', type: 'int', isNullable: true },
          { name: 'skinType', type: 'varchar', length: '50', isNullable: true },
          { name: 'customerSegment', type: 'varchar', length: '50', isNullable: true },
          { name: 'purchaseIntention', type: 'varchar', length: '20', default: "'unknown'" },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'usedAt', type: 'timestamp', default: 'now()' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'cosmetics_sample_usage_logs',
      new TableIndex({
        name: 'IDX_cosmetics_sample_usage_logs_inventoryId',
        columnNames: ['inventoryId'],
      })
    );
    await queryRunner.createIndex(
      'cosmetics_sample_usage_logs',
      new TableIndex({
        name: 'IDX_cosmetics_sample_usage_logs_storeId',
        columnNames: ['storeId'],
      })
    );
    await queryRunner.createIndex(
      'cosmetics_sample_usage_logs',
      new TableIndex({
        name: 'IDX_cosmetics_sample_usage_logs_productId',
        columnNames: ['productId'],
      })
    );
    await queryRunner.createIndex(
      'cosmetics_sample_usage_logs',
      new TableIndex({
        name: 'IDX_cosmetics_sample_usage_logs_customerId',
        columnNames: ['customerId'],
      })
    );
    await queryRunner.createIndex(
      'cosmetics_sample_usage_logs',
      new TableIndex({
        name: 'IDX_cosmetics_sample_usage_logs_usedAt',
        columnNames: ['usedAt'],
      })
    );

    // 3. cosmetics_sample_conversion
    await queryRunner.createTable(
      new Table({
        name: 'cosmetics_sample_conversion',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'usageLogId', type: 'uuid' },
          { name: 'storeId', type: 'uuid' },
          { name: 'productId', type: 'uuid' },
          { name: 'customerId', type: 'uuid', isNullable: true },
          { name: 'orderId', type: 'uuid', isNullable: true },
          { name: 'orderItemId', type: 'uuid', isNullable: true },
          { name: 'conversionType', type: 'varchar', length: '50', default: "'direct'" },
          { name: 'sampleCost', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'purchaseAmount', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'quantity', type: 'int', default: 1 },
          { name: 'daysSinceSample', type: 'int', default: 0 },
          { name: 'attributionModel', type: 'varchar', length: '50', default: "'first_touch'" },
          { name: 'isVerified', type: 'boolean', default: false },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'sampleUsedAt', type: 'timestamp' },
          { name: 'convertedAt', type: 'timestamp', default: 'now()' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'cosmetics_sample_conversion',
      new TableIndex({
        name: 'IDX_cosmetics_sample_conversion_usageLogId',
        columnNames: ['usageLogId'],
        isUnique: true,
      })
    );
    await queryRunner.createIndex(
      'cosmetics_sample_conversion',
      new TableIndex({
        name: 'IDX_cosmetics_sample_conversion_storeId',
        columnNames: ['storeId'],
      })
    );
    await queryRunner.createIndex(
      'cosmetics_sample_conversion',
      new TableIndex({
        name: 'IDX_cosmetics_sample_conversion_productId',
        columnNames: ['productId'],
      })
    );
    await queryRunner.createIndex(
      'cosmetics_sample_conversion',
      new TableIndex({
        name: 'IDX_cosmetics_sample_conversion_customerId',
        columnNames: ['customerId'],
      })
    );
    await queryRunner.createIndex(
      'cosmetics_sample_conversion',
      new TableIndex({
        name: 'IDX_cosmetics_sample_conversion_convertedAt',
        columnNames: ['convertedAt'],
      })
    );

    // 4. cosmetics_display_layouts
    await queryRunner.createTable(
      new Table({
        name: 'cosmetics_display_layouts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'storeId', type: 'uuid' },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'layoutType', type: 'varchar', length: '50', default: "'shelf'" },
          { name: 'location', type: 'varchar', length: '255', isNullable: true },
          { name: 'position', type: 'int', default: 0 },
          { name: 'dimensions', type: 'jsonb', isNullable: true },
          { name: 'slots', type: 'jsonb', isNullable: true },
          { name: 'assignedProducts', type: 'jsonb', default: "'[]'" },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'lastOptimizedAt', type: 'timestamp', isNullable: true },
          { name: 'performanceScore', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'cosmetics_display_layouts',
      new TableIndex({
        name: 'IDX_cosmetics_display_layouts_storeId',
        columnNames: ['storeId'],
      })
    );
    await queryRunner.createIndex(
      'cosmetics_display_layouts',
      new TableIndex({
        name: 'IDX_cosmetics_display_layouts_layoutType',
        columnNames: ['layoutType'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('cosmetics_display_layouts');
    await queryRunner.dropTable('cosmetics_sample_conversion');
    await queryRunner.dropTable('cosmetics_sample_usage_logs');
    await queryRunner.dropTable('cosmetics_sample_inventory');
  }
}
