import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Phase PD-9: Multichannel RPA 1차 - Database Migration
 *
 * Creates tables for external channel integration:
 * - external_channels: Available sales channels
 * - seller_channel_accounts: Seller connections to channels
 * - channel_product_links: Product export mappings
 * - channel_order_links: Order import mappings
 */
export class CreateChannelRPATables1761000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE channel_status AS ENUM ('active', 'inactive', 'maintenance')
    `);

    await queryRunner.query(`
      CREATE TYPE channel_product_status AS ENUM ('draft', 'exported', 'failed', 'inactive', 'out_of_sync')
    `);

    await queryRunner.query(`
      CREATE TYPE channel_order_status AS ENUM ('import_pending', 'imported', 'failed', 'cancelled')
    `);

    // 1. Create external_channels table
    await queryRunner.createTable(
      new Table({
        name: 'external_channels',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'status',
            type: 'channel_status',
            default: "'active'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'displayOrder',
            type: 'integer',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Create indexes for external_channels
    await queryRunner.createIndex(
      'external_channels',
      new TableIndex({
        name: 'IDX_EXTERNAL_CHANNEL_CODE',
        columnNames: ['code'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'external_channels',
      new TableIndex({
        name: 'IDX_EXTERNAL_CHANNEL_STATUS',
        columnNames: ['status'],
      })
    );

    // 2. Create seller_channel_accounts table
    await queryRunner.createTable(
      new Table({
        name: 'seller_channel_accounts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'sellerId',
            type: 'uuid',
          },
          {
            name: 'channelCode',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'displayName',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'credentials',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'lastSyncAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'lastSyncStatus',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'lastSyncError',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Create indexes for seller_channel_accounts
    await queryRunner.createIndex(
      'seller_channel_accounts',
      new TableIndex({
        name: 'IDX_SELLER_CHANNEL_ACCOUNT_SELLER_CHANNEL',
        columnNames: ['sellerId', 'channelCode'],
      })
    );

    await queryRunner.createIndex(
      'seller_channel_accounts',
      new TableIndex({
        name: 'IDX_SELLER_CHANNEL_ACCOUNT_SELLER_ACTIVE',
        columnNames: ['sellerId', 'isActive'],
      })
    );

    await queryRunner.createIndex(
      'seller_channel_accounts',
      new TableIndex({
        name: 'IDX_SELLER_CHANNEL_ACCOUNT_CHANNEL_ACTIVE',
        columnNames: ['channelCode', 'isActive'],
      })
    );

    // Create foreign keys for seller_channel_accounts
    await queryRunner.createForeignKey(
      'seller_channel_accounts',
      new TableForeignKey({
        columnNames: ['sellerId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'seller_channel_accounts',
      new TableForeignKey({
        columnNames: ['channelCode'],
        referencedTableName: 'external_channels',
        referencedColumnNames: ['code'],
        onDelete: 'RESTRICT',
      })
    );

    // 3. Create channel_product_links table
    await queryRunner.createTable(
      new Table({
        name: 'channel_product_links',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'sellerId',
            type: 'uuid',
          },
          {
            name: 'channelAccountId',
            type: 'uuid',
          },
          {
            name: 'sellerProductId',
            type: 'uuid',
          },
          {
            name: 'externalProductId',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'externalUrl',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'channel_product_status',
            default: "'draft'",
          },
          {
            name: 'lastSyncAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'lastErrorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'exportCount',
            type: 'integer',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Create indexes for channel_product_links
    await queryRunner.createIndex(
      'channel_product_links',
      new TableIndex({
        name: 'IDX_CHANNEL_PRODUCT_LINK_SELLER_ACCOUNT',
        columnNames: ['sellerId', 'channelAccountId'],
      })
    );

    await queryRunner.createIndex(
      'channel_product_links',
      new TableIndex({
        name: 'IDX_CHANNEL_PRODUCT_LINK_SELLER_PRODUCT',
        columnNames: ['sellerId', 'sellerProductId'],
      })
    );

    await queryRunner.createIndex(
      'channel_product_links',
      new TableIndex({
        name: 'IDX_CHANNEL_PRODUCT_LINK_ACCOUNT_STATUS',
        columnNames: ['channelAccountId', 'status'],
      })
    );

    await queryRunner.createIndex(
      'channel_product_links',
      new TableIndex({
        name: 'IDX_CHANNEL_PRODUCT_LINK_ACCOUNT_EXT_ID',
        columnNames: ['channelAccountId', 'externalProductId'],
      })
    );

    await queryRunner.createIndex(
      'channel_product_links',
      new TableIndex({
        name: 'IDX_CHANNEL_PRODUCT_LINK_UNIQUE',
        columnNames: ['sellerId', 'channelAccountId', 'sellerProductId'],
        isUnique: true,
      })
    );

    // Create foreign keys for channel_product_links
    await queryRunner.createForeignKey(
      'channel_product_links',
      new TableForeignKey({
        columnNames: ['sellerId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'channel_product_links',
      new TableForeignKey({
        columnNames: ['channelAccountId'],
        referencedTableName: 'seller_channel_accounts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'channel_product_links',
      new TableForeignKey({
        columnNames: ['sellerProductId'],
        referencedTableName: 'seller_products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // 4. Create channel_order_links table
    await queryRunner.createTable(
      new Table({
        name: 'channel_order_links',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'channelAccountId',
            type: 'uuid',
          },
          {
            name: 'externalOrderId',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'internalOrderId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'channel_order_status',
            default: "'import_pending'",
          },
          {
            name: 'lastSyncAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'lastErrorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'externalOrderData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'externalOrderDate',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'retryCount',
            type: 'integer',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Create indexes for channel_order_links
    await queryRunner.createIndex(
      'channel_order_links',
      new TableIndex({
        name: 'IDX_CHANNEL_ORDER_LINK_ACCOUNT_EXT_ID',
        columnNames: ['channelAccountId', 'externalOrderId'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'channel_order_links',
      new TableIndex({
        name: 'IDX_CHANNEL_ORDER_LINK_ACCOUNT_STATUS',
        columnNames: ['channelAccountId', 'status'],
      })
    );

    await queryRunner.createIndex(
      'channel_order_links',
      new TableIndex({
        name: 'IDX_CHANNEL_ORDER_LINK_INTERNAL_ORDER',
        columnNames: ['internalOrderId'],
      })
    );

    await queryRunner.createIndex(
      'channel_order_links',
      new TableIndex({
        name: 'IDX_CHANNEL_ORDER_LINK_CREATED_AT',
        columnNames: ['createdAt'],
      })
    );

    // Create foreign keys for channel_order_links
    await queryRunner.createForeignKey(
      'channel_order_links',
      new TableForeignKey({
        columnNames: ['channelAccountId'],
        referencedTableName: 'seller_channel_accounts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'channel_order_links',
      new TableForeignKey({
        columnNames: ['internalOrderId'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // Seed test_channel
    await queryRunner.query(`
      INSERT INTO external_channels (code, name, status, description, "displayOrder", metadata)
      VALUES (
        'test_channel',
        '테스트 채널',
        'active',
        'Internal testing channel for RPA flow validation',
        999,
        '{"type": "test", "apiUrl": "https://test-channel.local"}'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.dropTable('channel_order_links', true);
    await queryRunner.dropTable('channel_product_links', true);
    await queryRunner.dropTable('seller_channel_accounts', true);
    await queryRunner.dropTable('external_channels', true);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS channel_order_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS channel_product_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS channel_status`);
  }
}
