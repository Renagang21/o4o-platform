import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAffiliatePhase2Tables1735620000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create affiliate_commissions table
    await queryRunner.createTable(
      new Table({
        name: 'affiliate_commissions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'affiliateUserId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'conversionId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false
          },
          {
            name: 'commissionRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'"
          },
          {
            name: 'orderId',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'approvedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'approvedBy',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'paidAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'paymentReference',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'payoutId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'rejectionReason',
            type: 'text',
            isNullable: true
          },
          {
            name: 'metadata',
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
        ],
        foreignKeys: [
          {
            columnNames: ['affiliateUserId'],
            referencedTableName: 'affiliate_users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          },
          {
            columnNames: ['conversionId'],
            referencedTableName: 'affiliate_conversions',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create indexes for affiliate_commissions
    await queryRunner.createIndex('affiliate_commissions', new TableIndex({
      name: 'IDX_affiliate_commissions_affiliateUserId_status',
      columnNames: ['affiliateUserId', 'status']
    }));

    await queryRunner.createIndex('affiliate_commissions', new TableIndex({
      name: 'UQ_affiliate_commissions_conversionId',
      columnNames: ['conversionId'],
      isUnique: true
    }));

    await queryRunner.createIndex('affiliate_commissions', new TableIndex({
      name: 'IDX_affiliate_commissions_orderId',
      columnNames: ['orderId']
    }));

    await queryRunner.createIndex('affiliate_commissions', new TableIndex({
      name: 'IDX_affiliate_commissions_createdAt',
      columnNames: ['createdAt']
    }));

    // Create affiliate_payouts table
    await queryRunner.createTable(
      new Table({
        name: 'affiliate_payouts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'affiliateUserId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false
          },
          {
            name: 'commissionIds',
            type: 'text[]',
            isNullable: false
          },
          {
            name: 'paymentMethod',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'transactionId',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'"
          },
          {
            name: 'bankAccount',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'paymentDetails',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true
          },
          {
            name: 'failureReason',
            type: 'text',
            isNullable: true
          },
          {
            name: 'processedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'processedBy',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'paidAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'fees',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true
          },
          {
            name: 'netAmount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            isNullable: true
          },
          {
            name: 'metadata',
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
        ],
        foreignKeys: [
          {
            columnNames: ['affiliateUserId'],
            referencedTableName: 'affiliate_users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create indexes for affiliate_payouts
    await queryRunner.createIndex('affiliate_payouts', new TableIndex({
      name: 'IDX_affiliate_payouts_affiliateUserId_status',
      columnNames: ['affiliateUserId', 'status']
    }));

    await queryRunner.createIndex('affiliate_payouts', new TableIndex({
      name: 'IDX_affiliate_payouts_transactionId',
      columnNames: ['transactionId']
    }));

    await queryRunner.createIndex('affiliate_payouts', new TableIndex({
      name: 'IDX_affiliate_payouts_createdAt',
      columnNames: ['createdAt']
    }));

    // Create affiliate_audit_logs table
    await queryRunner.createTable(
      new Table({
        name: 'affiliate_audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'entityType',
            type: 'varchar',
            length: '50',
            isNullable: false
          },
          {
            name: 'entityId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'action',
            type: 'varchar',
            length: '50',
            isNullable: false
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'userEmail',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'userRole',
            type: 'varchar',
            length: '20',
            isNullable: false
          },
          {
            name: 'previousData',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'newData',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'changes',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'ipAddress',
            type: 'inet',
            isNullable: true
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create indexes for affiliate_audit_logs
    await queryRunner.createIndex('affiliate_audit_logs', new TableIndex({
      name: 'IDX_affiliate_audit_logs_entityType_entityId',
      columnNames: ['entityType', 'entityId']
    }));

    await queryRunner.createIndex('affiliate_audit_logs', new TableIndex({
      name: 'IDX_affiliate_audit_logs_userId',
      columnNames: ['userId']
    }));

    await queryRunner.createIndex('affiliate_audit_logs', new TableIndex({
      name: 'IDX_affiliate_audit_logs_createdAt',
      columnNames: ['createdAt']
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('affiliate_audit_logs', 'IDX_affiliate_audit_logs_createdAt');
    await queryRunner.dropIndex('affiliate_audit_logs', 'IDX_affiliate_audit_logs_userId');
    await queryRunner.dropIndex('affiliate_audit_logs', 'IDX_affiliate_audit_logs_entityType_entityId');
    
    await queryRunner.dropIndex('affiliate_payouts', 'IDX_affiliate_payouts_createdAt');
    await queryRunner.dropIndex('affiliate_payouts', 'IDX_affiliate_payouts_transactionId');
    await queryRunner.dropIndex('affiliate_payouts', 'IDX_affiliate_payouts_affiliateUserId_status');
    
    await queryRunner.dropIndex('affiliate_commissions', 'IDX_affiliate_commissions_createdAt');
    await queryRunner.dropIndex('affiliate_commissions', 'IDX_affiliate_commissions_orderId');
    await queryRunner.dropIndex('affiliate_commissions', 'UQ_affiliate_commissions_conversionId');
    await queryRunner.dropIndex('affiliate_commissions', 'IDX_affiliate_commissions_affiliateUserId_status');

    // Drop tables
    await queryRunner.dropTable('affiliate_audit_logs');
    await queryRunner.dropTable('affiliate_payouts');
    await queryRunner.dropTable('affiliate_commissions');
  }
}