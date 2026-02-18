import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Create Platform Store Payment Configs Table
 *
 * WO-CORE-STORE-PAYMENT-CONFIG-V1
 *
 * Creates:
 * - platform_store_payment_configs: Version-tracked PG payment gateway credentials per store
 *   apiKey/apiSecret columns store AES-256-CBC encrypted values
 */
export class CreatePlatformStorePaymentConfigs1771200000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'platform_store_payment_configs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'store_id',
            type: 'uuid',
          },
          {
            name: 'service_key',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
            comment: 'PG provider: inicis, toss, nicepay, kakaopay',
          },
          {
            name: 'mode',
            type: 'varchar',
            length: '10',
            default: "'test'",
            comment: 'test or live',
          },
          {
            name: 'merchant_id',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'api_key',
            type: 'text',
            isNullable: true,
            comment: 'AES-256-CBC encrypted',
          },
          {
            name: 'api_secret',
            type: 'text',
            isNullable: true,
            comment: 'AES-256-CBC encrypted',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'platform_store_payment_configs',
      new TableIndex({
        name: 'idx_platform_store_payment_configs_store_service',
        columnNames: ['store_id', 'service_key'],
      })
    );

    await queryRunner.createIndex(
      'platform_store_payment_configs',
      new TableIndex({
        name: 'idx_platform_store_payment_configs_is_active',
        columnNames: ['is_active'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('platform_store_payment_configs');
  }
}
