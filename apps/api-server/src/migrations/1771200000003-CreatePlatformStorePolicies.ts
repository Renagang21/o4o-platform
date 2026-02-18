import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Create Platform Store Policies Table
 *
 * WO-CORE-STORE-POLICY-SYSTEM-V1
 *
 * Creates:
 * - platform_store_policies: Version-tracked store policies (terms, privacy, refund, shipping)
 */
export class CreatePlatformStorePolicies1771200000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'platform_store_policies',
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
            comment: 'Service that owns this store: glycopharm, cosmetics, kpa, neture, glucoseview',
          },
          {
            name: 'terms_of_service',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'privacy_policy',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'refund_policy',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'shipping_policy',
            type: 'text',
            isNullable: true,
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

    // Composite index for looking up active policy by store
    await queryRunner.createIndex(
      'platform_store_policies',
      new TableIndex({
        name: 'idx_platform_store_policies_store_service',
        columnNames: ['store_id', 'service_key'],
      })
    );

    // Index for filtering active policies
    await queryRunner.createIndex(
      'platform_store_policies',
      new TableIndex({
        name: 'idx_platform_store_policies_is_active',
        columnNames: ['is_active'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('platform_store_policies');
  }
}
