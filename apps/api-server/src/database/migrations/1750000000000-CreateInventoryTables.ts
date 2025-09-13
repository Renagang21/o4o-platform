import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateInventoryTables1750000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create inventory table
    await queryRunner.createTable(
      new Table({
        name: 'inventory',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'vendorId',
            type: 'uuid'
          },
          {
            name: 'productId',
            type: 'uuid'
          },
          {
            name: 'sku',
            type: 'varchar',
            isUnique: true
          },
          {
            name: 'productName',
            type: 'varchar'
          },
          {
            name: 'productCategory',
            type: 'varchar',
            isNullable: true
          },
          // Quantity fields
          {
            name: 'quantity',
            type: 'int',
            default: 0
          },
          {
            name: 'reservedQuantity',
            type: 'int',
            default: 0
          },
          {
            name: 'availableQuantity',
            type: 'int',
            default: 0
          },
          {
            name: 'minQuantity',
            type: 'int',
            isNullable: true
          },
          {
            name: 'maxQuantity',
            type: 'int',
            isNullable: true
          },
          // Cost and value
          {
            name: 'unitCost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0
          },
          {
            name: 'totalValue',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0
          },
          // Location
          {
            name: 'warehouse',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'location',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'bin',
            type: 'varchar',
            isNullable: true
          },
          // Status
          {
            name: 'status',
            type: 'enum',
            enum: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'],
            default: "'in_stock'"
          },
          {
            name: 'batchNumber',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'serialNumber',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'expiryDate',
            type: 'timestamp',
            isNullable: true
          },
          // Analytics
          {
            name: 'dailyAvgSales',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0
          },
          {
            name: 'weeklyAvgSales',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0
          },
          {
            name: 'monthlyAvgSales',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0
          },
          {
            name: 'turnoverRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0
          },
          {
            name: 'daysOfStock',
            type: 'int',
            default: 0
          },
          // Reorder information
          {
            name: 'reorderPoint',
            type: 'int',
            isNullable: true
          },
          {
            name: 'reorderQuantity',
            type: 'int',
            isNullable: true
          },
          {
            name: 'leadTimeDays',
            type: 'int',
            isNullable: true
          },
          {
            name: 'supplierId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'supplierName',
            type: 'varchar',
            isNullable: true
          },
          // Tracking dates
          {
            name: 'lastRestockedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'lastSoldAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'lastCountedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'lastAdjustedAt',
            type: 'timestamp',
            isNullable: true
          },
          // Metadata
          {
            name: 'attributes',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'customFields',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create stock_movements table
    await queryRunner.createTable(
      new Table({
        name: 'stock_movements',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'inventoryId',
            type: 'uuid'
          },
          {
            name: 'movementType',
            type: 'enum',
            enum: [
              'purchase',
              'sale',
              'return',
              'adjustment',
              'transfer',
              'damage',
              'theft',
              'expiry',
              'production',
              'consumption'
            ]
          },
          {
            name: 'quantity',
            type: 'int'
          },
          {
            name: 'quantityBefore',
            type: 'int',
            isNullable: true
          },
          {
            name: 'quantityAfter',
            type: 'int',
            isNullable: true
          },
          {
            name: 'unitCost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'totalValue',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'referenceType',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'referenceNumber',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'referenceId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'fromLocation',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'toLocation',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'fromWarehouse',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'toWarehouse',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'userName',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'reason',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'batchNumber',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'serialNumber',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'expiryDate',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'completed', 'cancelled'],
            default: "'completed'"
          },
          {
            name: 'approvedBy',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'approvedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create reorder_rules table
    await queryRunner.createTable(
      new Table({
        name: 'reorder_rules',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'inventoryId',
            type: 'uuid'
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true
          },
          {
            name: 'triggerType',
            type: 'enum',
            enum: ['min_quantity', 'forecast', 'fixed_schedule', 'manual'],
            default: "'min_quantity'"
          },
          {
            name: 'minQuantity',
            type: 'int',
            isNullable: true
          },
          {
            name: 'maxQuantity',
            type: 'int',
            isNullable: true
          },
          {
            name: 'reorderPoint',
            type: 'int',
            isNullable: true
          },
          {
            name: 'reorderQuantity',
            type: 'int',
            isNullable: true
          },
          {
            name: 'forecastDays',
            type: 'int',
            isNullable: true
          },
          {
            name: 'safetyStockDays',
            type: 'int',
            isNullable: true
          },
          {
            name: 'seasonalityFactor',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true
          },
          {
            name: 'scheduleFrequency',
            type: 'enum',
            enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly'],
            isNullable: true
          },
          {
            name: 'scheduleDayOfWeek',
            type: 'int',
            isNullable: true
          },
          {
            name: 'scheduleDayOfMonth',
            type: 'int',
            isNullable: true
          },
          {
            name: 'scheduleTime',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'nextScheduledReorder',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'supplierId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'supplierName',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'supplierEmail',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'leadTimeDays',
            type: 'int',
            isNullable: true
          },
          {
            name: 'minOrderQuantity',
            type: 'int',
            isNullable: true
          },
          {
            name: 'maxOrderQuantity',
            type: 'int',
            isNullable: true
          },
          {
            name: 'orderMultiple',
            type: 'int',
            isNullable: true
          },
          {
            name: 'maxOrderValue',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'requiresApproval',
            type: 'boolean',
            default: false
          },
          {
            name: 'approvalThreshold',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'approverEmails',
            type: 'text',
            isNullable: true
          },
          {
            name: 'autoCreatePurchaseOrder',
            type: 'boolean',
            default: false
          },
          {
            name: 'autoSendToSupplier',
            type: 'boolean',
            default: false
          },
          {
            name: 'purchaseOrderTemplate',
            type: 'text',
            isNullable: true
          },
          {
            name: 'notifyOnTrigger',
            type: 'boolean',
            default: true
          },
          {
            name: 'notifyOnOrder',
            type: 'boolean',
            default: true
          },
          {
            name: 'notifyOnDelivery',
            type: 'boolean',
            default: true
          },
          {
            name: 'notificationEmails',
            type: 'text',
            isNullable: true
          },
          {
            name: 'timesTriggered',
            type: 'int',
            default: 0
          },
          {
            name: 'ordersCreated',
            type: 'int',
            default: 0
          },
          {
            name: 'totalQuantityOrdered',
            type: 'int',
            default: 0
          },
          {
            name: 'totalValueOrdered',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0
          },
          {
            name: 'lastTriggeredAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'lastOrderedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'lastDeliveredAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'costOptimization',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'demandForecasting',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'customRules',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create inventory_alerts table
    await queryRunner.createTable(
      new Table({
        name: 'inventory_alerts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'inventoryId',
            type: 'uuid'
          },
          {
            name: 'alertType',
            type: 'enum',
            enum: [
              'low_stock',
              'out_of_stock',
              'overstock',
              'expiry_warning',
              'expired',
              'reorder_point',
              'dead_stock',
              'slow_moving',
              'damage_reported',
              'theft_reported',
              'count_discrepancy',
              'price_change',
              'supplier_issue'
            ]
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['critical', 'high', 'medium', 'low', 'info'],
            default: "'medium'"
          },
          {
            name: 'title',
            type: 'varchar'
          },
          {
            name: 'message',
            type: 'text'
          },
          {
            name: 'currentQuantity',
            type: 'int',
            isNullable: true
          },
          {
            name: 'thresholdQuantity',
            type: 'int',
            isNullable: true
          },
          {
            name: 'recommendedAction',
            type: 'text',
            isNullable: true
          },
          {
            name: 'estimatedImpact',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true
          },
          {
            name: 'daysUntilStockout',
            type: 'int',
            isNullable: true
          },
          {
            name: 'daysOverstocked',
            type: 'int',
            isNullable: true
          },
          {
            name: 'expiryDate',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'daysUntilExpiry',
            type: 'int',
            isNullable: true
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'acknowledged', 'resolved', 'ignored', 'escalated'],
            default: "'active'"
          },
          {
            name: 'isRead',
            type: 'boolean',
            default: false
          },
          {
            name: 'isNotified',
            type: 'boolean',
            default: false
          },
          {
            name: 'acknowledgedBy',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'acknowledgedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'acknowledgmentNotes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'resolvedBy',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'resolvedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'resolutionNotes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'notifiedEmails',
            type: 'text',
            isNullable: true
          },
          {
            name: 'notifiedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'notificationAttempts',
            type: 'int',
            default: 0
          },
          {
            name: 'lastNotificationError',
            type: 'text',
            isNullable: true
          },
          {
            name: 'actionTaken',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'actionTakenBy',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'actionTakenAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'actionDetails',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'relatedOrderId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'relatedMovementId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'relatedSupplierId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'isRecurring',
            type: 'boolean',
            default: false
          },
          {
            name: 'occurrenceCount',
            type: 'int',
            default: 0
          },
          {
            name: 'firstOccurredAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'lastOccurredAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'autoResolve',
            type: 'boolean',
            default: false
          },
          {
            name: 'autoResolveAfterHours',
            type: 'int',
            isNullable: true
          },
          {
            name: 'scheduledResolveAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'context',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex('inventory', new TableIndex({
      name: 'IDX_inventory_vendor_product',
      columnNames: ['vendorId', 'productId'],
      isUnique: true
    }));

    await queryRunner.createIndex('inventory', new TableIndex({
      name: 'IDX_inventory_sku',
      columnNames: ['sku'],
      isUnique: true
    }));

    await queryRunner.createIndex('inventory', new TableIndex({
      name: 'IDX_inventory_status',
      columnNames: ['status']
    }));

    await queryRunner.createIndex('inventory', new TableIndex({
      name: 'IDX_inventory_lastRestockedAt',
      columnNames: ['lastRestockedAt']
    }));

    await queryRunner.createIndex('stock_movements', new TableIndex({
      name: 'IDX_stock_movements_inventory_created',
      columnNames: ['inventoryId', 'created_at']
    }));

    await queryRunner.createIndex('stock_movements', new TableIndex({
      name: 'IDX_stock_movements_type',
      columnNames: ['movementType']
    }));

    await queryRunner.createIndex('stock_movements', new TableIndex({
      name: 'IDX_stock_movements_reference',
      columnNames: ['referenceNumber']
    }));

    await queryRunner.createIndex('stock_movements', new TableIndex({
      name: 'IDX_stock_movements_created',
      columnNames: ['created_at']
    }));

    await queryRunner.createIndex('reorder_rules', new TableIndex({
      name: 'IDX_reorder_rules_inventory',
      columnNames: ['inventoryId'],
      isUnique: true
    }));

    await queryRunner.createIndex('reorder_rules', new TableIndex({
      name: 'IDX_reorder_rules_active',
      columnNames: ['isActive']
    }));

    await queryRunner.createIndex('reorder_rules', new TableIndex({
      name: 'IDX_reorder_rules_triggered',
      columnNames: ['lastTriggeredAt']
    }));

    await queryRunner.createIndex('inventory_alerts', new TableIndex({
      name: 'IDX_inventory_alerts_inventory_status',
      columnNames: ['inventoryId', 'status']
    }));

    await queryRunner.createIndex('inventory_alerts', new TableIndex({
      name: 'IDX_inventory_alerts_type_severity',
      columnNames: ['alertType', 'severity']
    }));

    await queryRunner.createIndex('inventory_alerts', new TableIndex({
      name: 'IDX_inventory_alerts_created',
      columnNames: ['created_at']
    }));

    await queryRunner.createIndex('inventory_alerts', new TableIndex({
      name: 'IDX_inventory_alerts_acknowledged',
      columnNames: ['acknowledgedAt']
    }));

    // Create foreign keys
    await queryRunner.createForeignKey('inventory', new TableForeignKey({
      columnNames: ['vendorId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'vendor_info',
      onDelete: 'CASCADE'
    }));

    await queryRunner.createForeignKey('stock_movements', new TableForeignKey({
      columnNames: ['inventoryId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'inventory',
      onDelete: 'CASCADE'
    }));

    await queryRunner.createForeignKey('reorder_rules', new TableForeignKey({
      columnNames: ['inventoryId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'inventory',
      onDelete: 'CASCADE'
    }));

    await queryRunner.createForeignKey('inventory_alerts', new TableForeignKey({
      columnNames: ['inventoryId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'inventory',
      onDelete: 'CASCADE'
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const inventoryAlertsTable = await queryRunner.getTable('inventory_alerts');
    const inventoryAlertsForeignKey = inventoryAlertsTable?.foreignKeys.find(fk => fk.columnNames.indexOf('inventoryId') !== -1);
    if (inventoryAlertsForeignKey) {
      await queryRunner.dropForeignKey('inventory_alerts', inventoryAlertsForeignKey);
    }

    const reorderRulesTable = await queryRunner.getTable('reorder_rules');
    const reorderRulesForeignKey = reorderRulesTable?.foreignKeys.find(fk => fk.columnNames.indexOf('inventoryId') !== -1);
    if (reorderRulesForeignKey) {
      await queryRunner.dropForeignKey('reorder_rules', reorderRulesForeignKey);
    }

    const stockMovementsTable = await queryRunner.getTable('stock_movements');
    const stockMovementsForeignKey = stockMovementsTable?.foreignKeys.find(fk => fk.columnNames.indexOf('inventoryId') !== -1);
    if (stockMovementsForeignKey) {
      await queryRunner.dropForeignKey('stock_movements', stockMovementsForeignKey);
    }

    const inventoryTable = await queryRunner.getTable('inventory');
    const inventoryForeignKey = inventoryTable?.foreignKeys.find(fk => fk.columnNames.indexOf('vendorId') !== -1);
    if (inventoryForeignKey) {
      await queryRunner.dropForeignKey('inventory', inventoryForeignKey);
    }

    // Drop tables
    await queryRunner.dropTable('inventory_alerts');
    await queryRunner.dropTable('reorder_rules');
    await queryRunner.dropTable('stock_movements');
    await queryRunner.dropTable('inventory');
  }
}