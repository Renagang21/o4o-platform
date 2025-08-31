import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAffiliateTables1735610000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create affiliate_users table
    await queryRunner.createTable(
      new Table({
        name: 'affiliate_users',
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
            default: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create indexes for affiliate_users
    await queryRunner.createIndex('affiliate_users', new TableIndex({
      name: 'IDX_affiliate_users_userId',
      columnNames: ['userId']
    }));

    await queryRunner.createIndex('affiliate_users', new TableIndex({
      name: 'IDX_affiliate_users_status',
      columnNames: ['status']
    }));

    // Create affiliate_clicks table
    await queryRunner.createTable(
      new Table({
        name: 'affiliate_clicks',
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

    // Create indexes for affiliate_clicks
    await queryRunner.createIndex('affiliate_clicks', new TableIndex({
      name: 'IDX_affiliate_clicks_affiliateUserId_createdAt',
      columnNames: ['affiliateUserId', 'createdAt']
    }));

    await queryRunner.createIndex('affiliate_clicks', new TableIndex({
      name: 'IDX_affiliate_clicks_sessionId',
      columnNames: ['sessionId']
    }));

    await queryRunner.createIndex('affiliate_clicks', new TableIndex({
      name: 'IDX_affiliate_clicks_ipAddress',
      columnNames: ['ipAddress']
    }));

    // Create affiliate_conversions table
    await queryRunner.createTable(
      new Table({
        name: 'affiliate_conversions',
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
            columnNames: ['customerId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL'
          },
          {
            columnNames: ['orderId'],
            referencedTableName: 'orders',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL'
          }
        ]
      }),
      true
    );

    // Create indexes for affiliate_conversions
    await queryRunner.createIndex('affiliate_conversions', new TableIndex({
      name: 'IDX_affiliate_conversions_affiliateUserId_createdAt',
      columnNames: ['affiliateUserId', 'createdAt']
    }));

    await queryRunner.createIndex('affiliate_conversions', new TableIndex({
      name: 'IDX_affiliate_conversions_status',
      columnNames: ['status']
    }));

    await queryRunner.createIndex('affiliate_conversions', new TableIndex({
      name: 'IDX_affiliate_conversions_orderId',
      columnNames: ['orderId']
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('affiliate_conversions', 'IDX_affiliate_conversions_orderId');
    await queryRunner.dropIndex('affiliate_conversions', 'IDX_affiliate_conversions_status');
    await queryRunner.dropIndex('affiliate_conversions', 'IDX_affiliate_conversions_affiliateUserId_createdAt');
    
    await queryRunner.dropIndex('affiliate_clicks', 'IDX_affiliate_clicks_ipAddress');
    await queryRunner.dropIndex('affiliate_clicks', 'IDX_affiliate_clicks_sessionId');
    await queryRunner.dropIndex('affiliate_clicks', 'IDX_affiliate_clicks_affiliateUserId_createdAt');
    
    await queryRunner.dropIndex('affiliate_users', 'IDX_affiliate_users_status');
    await queryRunner.dropIndex('affiliate_users', 'IDX_affiliate_users_userId');

    // Drop tables
    await queryRunner.dropTable('affiliate_conversions');
    await queryRunner.dropTable('affiliate_clicks');
    await queryRunner.dropTable('affiliate_users');
  }
}