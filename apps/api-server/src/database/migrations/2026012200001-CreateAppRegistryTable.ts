/**
 * Migration: CreateAppRegistryTable
 *
 * Creates the app_registry table for managing feature-level app installation status.
 * Used by AppManager to track installed apps (forum, digitalsignage, dropshipping, etc.)
 */

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAppRegistryTable2026012200001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const tableExists = await queryRunner.hasTable('app_registry');
    if (tableExists) {
      console.log('✅ app_registry table already exists, skipping creation');
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'app_registry',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'appId',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'version',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'previousVersion',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
            default: "'standalone'",
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'installed'",
          },
          {
            name: 'dependencies',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'source',
            type: 'varchar',
            length: '50',
            default: "'local'",
          },
          {
            name: 'installedAt',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'NOW()',
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'app_registry',
      new TableIndex({
        name: 'IDX_app_registry_appId',
        columnNames: ['appId'],
      })
    );

    await queryRunner.createIndex(
      'app_registry',
      new TableIndex({
        name: 'IDX_app_registry_status',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'app_registry',
      new TableIndex({
        name: 'IDX_app_registry_type',
        columnNames: ['type'],
      })
    );

    console.log('✅ app_registry table created with indexes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('app_registry', 'IDX_app_registry_type');
    await queryRunner.dropIndex('app_registry', 'IDX_app_registry_status');
    await queryRunner.dropIndex('app_registry', 'IDX_app_registry_appId');
    await queryRunner.dropTable('app_registry');
    console.log('✅ app_registry table dropped');
  }
}
