import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreatePartnerTables1780000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create partner_users table
    await queryRunner.createTable(
      new Table({
        name: 'partner_users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'referralCode',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'active'"
          },
          {
            name: 'commissionRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 10.00
          },
          {
            name: 'totalClicks',
            type: 'int',
            default: 0
          },
          {
            name: 'totalConversions',
            type: 'int',
            default: 0
          },
          {
            name: 'totalEarnings',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0
          },
          {
            name: 'pendingEarnings',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0
          },
          {
            name: 'paidEarnings',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'websiteUrl',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'lastClickAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'lastConversionAt',
            type: 'timestamp',
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
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create partner_clicks table
    await queryRunner.createTable(
      new Table({
        name: 'partner_clicks',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'partnerUserId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'sessionId',
            type: 'varchar',
            length: '100',
            isNullable: false
          },
          {
            name: 'ipAddress',
            type: 'inet',
            isNullable: false
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true
          },
          {
            name: 'referrerUrl',
            type: 'text',
            isNullable: true
          },
          {
            name: 'landingUrl',
            type: 'text',
            isNullable: false
          },
          {
            name: 'device',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'browser',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'os',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'country',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'isConverted',
            type: 'boolean',
            default: false
          },
          {
            name: 'convertedAt',
            type: 'timestamp',
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

    // Create partner_conversions table
    await queryRunner.createTable(
      new Table({
        name: 'partner_conversions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'partnerUserId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'customerId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'orderId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'sessionId',
            type: 'varchar',
            length: '100',
            isNullable: false
          },
          {
            name: 'conversionType',
            type: 'varchar',
            length: '50',
            default: "'sale'"
          },
          {
            name: 'orderAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false
          },
          {
            name: 'commissionAmount',
            type: 'decimal',
            precision: 10,
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
            name: 'notes',
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
            name: 'metadata',
            type: 'jsonb',
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
            name: 'paymentReferenceId',
            type: 'varchar',
            length: '100',
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
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create partner_commissions table
    await queryRunner.createTable(
      new Table({
        name: 'partner_commissions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'partnerUserId',
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
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create partner_payouts table
    await queryRunner.createTable(
      new Table({
        name: 'partner_payouts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'partnerUserId',
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
            type: 'text',
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
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create partner_sessions table
    await queryRunner.createTable(
      new Table({
        name: 'partner_sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'sessionId',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false
          },
          {
            name: 'partnerUserId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'referralCode',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'source',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'medium',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'campaign',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'landingUrl',
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
            name: 'deviceInfo',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'geoInfo',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'pageViews',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'events',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'startedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'lastActivity',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'duration',
            type: 'int',
            default: 0
          },
          {
            name: 'pageCount',
            type: 'int',
            default: 0
          },
          {
            name: 'eventCount',
            type: 'int',
            default: 0
          },
          {
            name: 'converted',
            type: 'boolean',
            default: false
          },
          {
            name: 'convertedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'conversionValue',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true
          },
          {
            name: 'conversionOrderId',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'engagementScore',
            type: 'float',
            isNullable: true
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true
          }
        ]
      }),
      true
    );

    // Create partner_notifications table
    await queryRunner.createTable(
      new Table({
        name: 'partner_notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'partnerUserId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: false
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          {
            name: 'message',
            type: 'text',
            isNullable: false
          },
          {
            name: 'data',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'read',
            type: 'boolean',
            default: false
          },
          {
            name: 'readAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'priority',
            type: 'varchar',
            length: '20',
            default: "'low'"
          },
          {
            name: 'actionUrl',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'actionText',
            type: 'varchar',
            length: '50',
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

    // Create partner_analytics_cache table
    await queryRunner.createTable(
      new Table({
        name: 'partner_analytics_cache',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'cacheKey',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false
          },
          {
            name: 'data',
            type: 'jsonb',
            isNullable: false
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: false
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'partnerId',
            type: 'varchar',
            length: '255',
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
          }
        ]
      }),
      true
    );

    // Create partner_audit_logs table
    await queryRunner.createTable(
      new Table({
        name: 'partner_audit_logs',
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

    // Create indexes
    await queryRunner.createIndex('partner_users', new TableIndex({
      name: 'IDX_partner_users_referralCode',
      columnNames: ['referralCode'],
      isUnique: true
    }));

    await queryRunner.createIndex('partner_users', new TableIndex({
      name: 'IDX_partner_users_userId',
      columnNames: ['userId']
    }));

    await queryRunner.createIndex('partner_users', new TableIndex({
      name: 'IDX_partner_users_status',
      columnNames: ['status']
    }));

    await queryRunner.createIndex('partner_clicks', new TableIndex({
      name: 'IDX_partner_clicks_partnerUserId_createdAt',
      columnNames: ['partnerUserId', 'createdAt']
    }));

    await queryRunner.createIndex('partner_clicks', new TableIndex({
      name: 'IDX_partner_clicks_sessionId',
      columnNames: ['sessionId']
    }));

    await queryRunner.createIndex('partner_clicks', new TableIndex({
      name: 'IDX_partner_clicks_ipAddress',
      columnNames: ['ipAddress']
    }));

    await queryRunner.createIndex('partner_conversions', new TableIndex({
      name: 'IDX_partner_conversions_partnerUserId_createdAt',
      columnNames: ['partnerUserId', 'createdAt']
    }));

    await queryRunner.createIndex('partner_conversions', new TableIndex({
      name: 'IDX_partner_conversions_status',
      columnNames: ['status']
    }));

    await queryRunner.createIndex('partner_conversions', new TableIndex({
      name: 'IDX_partner_conversions_orderId',
      columnNames: ['orderId']
    }));

    await queryRunner.createIndex('partner_commissions', new TableIndex({
      name: 'IDX_partner_commissions_partnerUserId_status',
      columnNames: ['partnerUserId', 'status']
    }));

    await queryRunner.createIndex('partner_commissions', new TableIndex({
      name: 'IDX_partner_commissions_conversionId',
      columnNames: ['conversionId'],
      isUnique: true
    }));

    await queryRunner.createIndex('partner_commissions', new TableIndex({
      name: 'IDX_partner_commissions_orderId',
      columnNames: ['orderId']
    }));

    await queryRunner.createIndex('partner_commissions', new TableIndex({
      name: 'IDX_partner_commissions_createdAt',
      columnNames: ['createdAt']
    }));

    await queryRunner.createIndex('partner_payouts', new TableIndex({
      name: 'IDX_partner_payouts_partnerUserId_status',
      columnNames: ['partnerUserId', 'status']
    }));

    await queryRunner.createIndex('partner_payouts', new TableIndex({
      name: 'IDX_partner_payouts_transactionId',
      columnNames: ['transactionId']
    }));

    await queryRunner.createIndex('partner_payouts', new TableIndex({
      name: 'IDX_partner_payouts_createdAt',
      columnNames: ['createdAt']
    }));

    await queryRunner.createIndex('partner_sessions', new TableIndex({
      name: 'IDX_partner_sessions_sessionId',
      columnNames: ['sessionId'],
      isUnique: true
    }));

    await queryRunner.createIndex('partner_sessions', new TableIndex({
      name: 'IDX_partner_sessions_partnerUserId_startedAt',
      columnNames: ['partnerUserId', 'startedAt']
    }));

    await queryRunner.createIndex('partner_sessions', new TableIndex({
      name: 'IDX_partner_sessions_converted',
      columnNames: ['converted']
    }));

    await queryRunner.createIndex('partner_sessions', new TableIndex({
      name: 'IDX_partner_sessions_source',
      columnNames: ['source']
    }));

    await queryRunner.createIndex('partner_notifications', new TableIndex({
      name: 'IDX_partner_notifications_partnerUserId_read',
      columnNames: ['partnerUserId', 'read']
    }));

    await queryRunner.createIndex('partner_notifications', new TableIndex({
      name: 'IDX_partner_notifications_createdAt',
      columnNames: ['createdAt']
    }));

    await queryRunner.createIndex('partner_notifications', new TableIndex({
      name: 'IDX_partner_notifications_type',
      columnNames: ['type']
    }));

    await queryRunner.createIndex('partner_analytics_cache', new TableIndex({
      name: 'IDX_partner_analytics_cache_cacheKey',
      columnNames: ['cacheKey'],
      isUnique: true
    }));

    await queryRunner.createIndex('partner_analytics_cache', new TableIndex({
      name: 'IDX_partner_analytics_cache_expiresAt',
      columnNames: ['expiresAt']
    }));

    await queryRunner.createIndex('partner_audit_logs', new TableIndex({
      name: 'IDX_partner_audit_logs_entityType_entityId',
      columnNames: ['entityType', 'entityId']
    }));

    await queryRunner.createIndex('partner_audit_logs', new TableIndex({
      name: 'IDX_partner_audit_logs_userId',
      columnNames: ['userId']
    }));

    await queryRunner.createIndex('partner_audit_logs', new TableIndex({
      name: 'IDX_partner_audit_logs_createdAt',
      columnNames: ['createdAt']
    }));

    // Create foreign keys
    await queryRunner.createForeignKey('partner_users', new TableForeignKey({
      columnNames: ['userId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'users',
      onDelete: 'CASCADE'
    }));

    await queryRunner.createForeignKey('partner_clicks', new TableForeignKey({
      columnNames: ['partnerUserId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'partner_users',
      onDelete: 'CASCADE'
    }));

    await queryRunner.createForeignKey('partner_conversions', new TableForeignKey({
      columnNames: ['partnerUserId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'partner_users',
      onDelete: 'CASCADE'
    }));

    await queryRunner.createForeignKey('partner_conversions', new TableForeignKey({
      columnNames: ['customerId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'users',
      onDelete: 'SET NULL'
    }));

    await queryRunner.createForeignKey('partner_commissions', new TableForeignKey({
      columnNames: ['partnerUserId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'partner_users'
    }));

    await queryRunner.createForeignKey('partner_commissions', new TableForeignKey({
      columnNames: ['conversionId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'partner_conversions'
    }));

    await queryRunner.createForeignKey('partner_payouts', new TableForeignKey({
      columnNames: ['partnerUserId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'partner_users'
    }));

    await queryRunner.createForeignKey('partner_sessions', new TableForeignKey({
      columnNames: ['partnerUserId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'partner_users'
    }));

    await queryRunner.createForeignKey('partner_notifications', new TableForeignKey({
      columnNames: ['partnerUserId'],
      referencedColumnNames: ['id'],
      referencedTableName: 'partner_users'
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order to handle foreign key constraints
    await queryRunner.dropTable('partner_audit_logs');
    await queryRunner.dropTable('partner_analytics_cache');
    await queryRunner.dropTable('partner_notifications');
    await queryRunner.dropTable('partner_sessions');
    await queryRunner.dropTable('partner_payouts');
    await queryRunner.dropTable('partner_commissions');
    await queryRunner.dropTable('partner_conversions');
    await queryRunner.dropTable('partner_clicks');
    await queryRunner.dropTable('partner_users');
  }
}