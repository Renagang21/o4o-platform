import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Create Platform Store Slugs Tables
 *
 * WO-CORE-STORE-SLUG-SYSTEM-V1
 *
 * Creates:
 * - platform_store_slugs: Platform-wide unique store slug registry
 * - platform_store_slug_history: Tracks slug changes (for redirects & 1-time policy)
 */
export class CreatePlatformStoreSlugsTables1771200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create platform_store_slugs table
    await queryRunner.createTable(
      new Table({
        name: 'platform_store_slugs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '120',
            isUnique: true,
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
            name: 'is_active',
            type: 'boolean',
            default: true,
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

    // Create indexes for platform_store_slugs
    await queryRunner.createIndex(
      'platform_store_slugs',
      new TableIndex({
        name: 'idx_platform_store_slugs_slug',
        columnNames: ['slug'],
      })
    );

    await queryRunner.createIndex(
      'platform_store_slugs',
      new TableIndex({
        name: 'idx_platform_store_slugs_service_store',
        columnNames: ['service_key', 'store_id'],
      })
    );

    // Create platform_store_slug_history table
    await queryRunner.createTable(
      new Table({
        name: 'platform_store_slug_history',
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
            name: 'old_slug',
            type: 'varchar',
            length: '120',
          },
          {
            name: 'new_slug',
            type: 'varchar',
            length: '120',
          },
          {
            name: 'changed_by',
            type: 'uuid',
          },
          {
            name: 'changed_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Create indexes for platform_store_slug_history
    await queryRunner.createIndex(
      'platform_store_slug_history',
      new TableIndex({
        name: 'idx_platform_store_slug_history_store',
        columnNames: ['store_id'],
      })
    );

    await queryRunner.createIndex(
      'platform_store_slug_history',
      new TableIndex({
        name: 'idx_platform_store_slug_history_old_slug',
        columnNames: ['old_slug'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('platform_store_slug_history');
    await queryRunner.dropTable('platform_store_slugs');
  }
}
