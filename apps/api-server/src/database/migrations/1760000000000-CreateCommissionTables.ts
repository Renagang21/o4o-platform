import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateCommissionTables1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create vendor_commissions table
    await queryRunner.createTable(
      new Table({
        name: 'vendor_commissions',
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
          // Period information
          {
            name: 'period',
            type: 'varchar'
          },
          {
            name: 'startDate',
            type: 'timestamp'
          },
          {
            name: 'endDate',
            type: 'timestamp'
          },
          // Sales data
          {
            name: 'totalOrders',
            type: 'int',
            default: 0
          },
          {
            name: 'completedOrders',
            type: 'int',
            default: 0
          },
          {
            name: 'cancelledOrders',
            type: 'int',
            default: 0
          },
          {
            name: 'refundedOrders',
            type: 'int',
            default: 0
          },
          {
            name: 'grossSales',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'netSales',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'refundAmount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          // Commission calculation
          {
            name: 'commissionRate',
            type: 'decimal',
            precision: 5,
            scale: 2
          },
          {
            name: 'baseCommission',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'bonusCommission',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'totalCommission',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          // Deductions
          {
            name: 'platformFee',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'transactionFee',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'refundDeduction',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'otherDeductions',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'totalDeductions',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          // Final amounts
          {
            name: 'netCommission',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'previousBalance',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'totalPayable',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          // Affiliate commissions
          {
            name: 'affiliateEarnings',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'affiliateClicks',
            type: 'int',
            default: 0
          },
          {
            name: 'affiliateConversions',
            type: 'int',
            default: 0
          },
          // Product performance
          {
            name: 'totalProductsSold',
            type: 'int',
            default: 0
          },
          {
            name: 'uniqueProductsSold',
            type: 'int',
            default: 0
          },
          {
            name: 'topProducts',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'categoryBreakdown',
            type: 'jsonb',
            isNullable: true
          },
          // Status and approval
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'pending', 'approved', 'paid', 'disputed', 'cancelled'],
            default: "'draft'"
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
            name: 'approvalNotes',
            type: 'text',
            isNullable: true
          },
          // Payment information
          {
            name: 'paymentMethod',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'paymentReference',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'paidAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'paidAmount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true
          },
          {
            name: 'bankAccountNumber',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'bankName',
            type: 'varchar',
            isNullable: true
          },
          // Dispute handling
          {
            name: 'isDisputed',
            type: 'boolean',
            default: false
          },
          {
            name: 'disputeReason',
            type: 'text',
            isNullable: true
          },
          {
            name: 'disputedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'disputeResolvedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'disputeResolution',
            type: 'text',
            isNullable: true
          },
          // Adjustments and invoice
          {
            name: 'adjustments',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'totalAdjustments',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'invoiceNumber',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'invoiceUrl',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'invoiceGeneratedAt',
            type: 'timestamp',
            isNullable: true
          },
          // Notes and metadata
          {
            name: 'internalNotes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'vendorNotes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'calculationDetails',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create commission_settlements table
    await queryRunner.createTable(
      new Table({
        name: 'commission_settlements',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'supplierId',
            type: 'uuid'
          },
          // Settlement period
          {
            name: 'period',
            type: 'varchar'
          },
          {
            name: 'startDate',
            type: 'timestamp'
          },
          {
            name: 'endDate',
            type: 'timestamp'
          },
          {
            name: 'settlementDate',
            type: 'timestamp'
          },
          // Order statistics
          {
            name: 'totalOrders',
            type: 'int',
            default: 0
          },
          {
            name: 'completedOrders',
            type: 'int',
            default: 0
          },
          {
            name: 'returnedOrders',
            type: 'int',
            default: 0
          },
          {
            name: 'cancelledOrders',
            type: 'int',
            default: 0
          },
          // Product statistics
          {
            name: 'totalProductsSold',
            type: 'int',
            default: 0
          },
          {
            name: 'uniqueProductsSold',
            type: 'int',
            default: 0
          },
          {
            name: 'productBreakdown',
            type: 'jsonb',
            isNullable: true
          },
          // Financial calculations
          {
            name: 'grossRevenue',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'returns',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'netRevenue',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'supplierCost',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'grossMargin',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'marginRate',
            type: 'decimal',
            precision: 5,
            scale: 2
          },
          // Platform fees and commissions
          {
            name: 'platformCommissionRate',
            type: 'decimal',
            precision: 5,
            scale: 2
          },
          {
            name: 'platformCommission',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'transactionFees',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'processingFees',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'shippingCosts',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'totalFees',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          // Supplier earnings
          {
            name: 'supplierEarnings',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'previousBalance',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'totalPayable',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          // Performance metrics
          {
            name: 'averageOrderValue',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true
          },
          {
            name: 'returnRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true
          },
          {
            name: 'cancellationRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true
          },
          {
            name: 'fulfillmentRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true
          },
          {
            name: 'averageDeliveryDays',
            type: 'int',
            isNullable: true
          },
          {
            name: 'categoryBreakdown',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'warehouseBreakdown',
            type: 'jsonb',
            isNullable: true
          },
          // Settlement status
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'pending', 'approved', 'processing', 'paid', 'failed', 'disputed'],
            default: "'draft'"
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
            name: 'approvalNotes',
            type: 'text',
            isNullable: true
          },
          // Payment details
          {
            name: 'paymentMethod',
            type: 'enum',
            enum: ['bank_transfer', 'check', 'wire', 'paypal', 'other'],
            isNullable: true
          },
          {
            name: 'paymentReference',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'paymentDate',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'paidAmount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true
          },
          {
            name: 'paymentConfirmation',
            type: 'varchar',
            isNullable: true
          },
          // Banking information
          {
            name: 'bankName',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'bankAccountNumber',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'bankRoutingNumber',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'swiftCode',
            type: 'varchar',
            isNullable: true
          },
          // Dispute handling
          {
            name: 'hasDispute',
            type: 'boolean',
            default: false
          },
          {
            name: 'disputeReason',
            type: 'text',
            isNullable: true
          },
          {
            name: 'disputeRaisedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'disputeResolvedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'disputeResolution',
            type: 'text',
            isNullable: true
          },
          {
            name: 'disputeAmount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true
          },
          // Adjustments and tax
          {
            name: 'adjustments',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'totalAdjustments',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'taxAmount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0
          },
          {
            name: 'taxRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true
          },
          {
            name: 'taxInvoiceNumber',
            type: 'varchar',
            isNullable: true
          },
          // Documents
          {
            name: 'statementNumber',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'statementUrl',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'invoiceNumber',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'invoiceUrl',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'supportingDocuments',
            type: 'text',
            isNullable: true
          },
          // Reconciliation
          {
            name: 'isReconciled',
            type: 'boolean',
            default: false
          },
          {
            name: 'reconciledAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'reconciledBy',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'reconciliationNotes',
            type: 'text',
            isNullable: true
          },
          // Currency
          {
            name: 'currency',
            type: 'varchar',
            default: "'USD'"
          },
          {
            name: 'exchangeRate',
            type: 'decimal',
            precision: 10,
            scale: 4,
            isNullable: true
          },
          {
            name: 'localCurrencyAmount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true
          },
          // Notes and metadata
          {
            name: 'internalNotes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'supplierNotes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'detailedBreakdown',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex('vendor_commissions', new TableIndex({
      name: 'IDX_vendor_commissions_vendor_period',
      columnNames: ['vendorId', 'period'],
      isUnique: true
    }));

    await queryRunner.createIndex('vendor_commissions', new TableIndex({
      name: 'IDX_vendor_commissions_status',
      columnNames: ['status']
    }));

    await queryRunner.createIndex('vendor_commissions', new TableIndex({
      name: 'IDX_vendor_commissions_period',
      columnNames: ['period']
    }));

    await queryRunner.createIndex('vendor_commissions', new TableIndex({
      name: 'IDX_vendor_commissions_created',
      columnNames: ['createdAt']
    }));

    await queryRunner.createIndex('commission_settlements', new TableIndex({
      name: 'IDX_commission_settlements_supplier_period',
      columnNames: ['supplierId', 'period'],
      isUnique: true
    }));

    await queryRunner.createIndex('commission_settlements', new TableIndex({
      name: 'IDX_commission_settlements_status',
      columnNames: ['status']
    }));

    await queryRunner.createIndex('commission_settlements', new TableIndex({
      name: 'IDX_commission_settlements_period',
      columnNames: ['period']
    }));

    await queryRunner.createIndex('commission_settlements', new TableIndex({
      name: 'IDX_commission_settlements_settlement_date',
      columnNames: ['settlementDate']
    }));

    // Create foreign keys
    await queryRunner.createForeignKey('vendor_commissions', new TableForeignKey({
      columnNames: ['vendorId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'vendor_info',
      onDelete: 'CASCADE'
    }));

    await queryRunner.createForeignKey('commission_settlements', new TableForeignKey({
      columnNames: ['supplierId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'suppliers',
      onDelete: 'CASCADE'
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const vendorCommissionsTable = await queryRunner.getTable('vendor_commissions');
    const vendorCommissionsForeignKey = vendorCommissionsTable?.foreignKeys.find(
      fk => fk.columnNames.indexOf('vendorId') !== -1
    );
    if (vendorCommissionsForeignKey) {
      await queryRunner.dropForeignKey('vendor_commissions', vendorCommissionsForeignKey);
    }

    const commissionSettlementsTable = await queryRunner.getTable('commission_settlements');
    const commissionSettlementsForeignKey = commissionSettlementsTable?.foreignKeys.find(
      fk => fk.columnNames.indexOf('supplierId') !== -1
    );
    if (commissionSettlementsForeignKey) {
      await queryRunner.dropForeignKey('commission_settlements', commissionSettlementsForeignKey);
    }

    // Drop tables
    await queryRunner.dropTable('commission_settlements');
    await queryRunner.dropTable('vendor_commissions');
  }
}