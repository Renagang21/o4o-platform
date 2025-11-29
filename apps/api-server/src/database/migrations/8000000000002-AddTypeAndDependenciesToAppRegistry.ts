import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * AddTypeAndDependenciesToAppRegistry Migration
 *
 * Adds type and dependencies columns to app_registry table
 * to support Core/Extension app pattern and dependency management
 */
export class AddTypeAndDependenciesToAppRegistry8000000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add type column (core/extension/standalone)
    await queryRunner.addColumn(
      'app_registry',
      new TableColumn({
        name: 'type',
        type: 'enum',
        enum: ['core', 'extension', 'standalone'],
        default: "'standalone'",
        comment: 'App type: core (owns tables), extension (extends core), or standalone'
      })
    );

    // Add dependencies column (JSONB)
    await queryRunner.addColumn(
      'app_registry',
      new TableColumn({
        name: 'dependencies',
        type: 'jsonb',
        isNullable: true,
        default: "'{}'::jsonb",
        comment: 'App dependencies in format { "app-id": "version-range" }'
      })
    );

    // Create index on type column for faster filtering
    await queryRunner.createIndex(
      'app_registry',
      new TableIndex({
        name: 'IDX_app_registry_type',
        columnNames: ['type']
      })
    );

    // Update existing forum apps to correct types
    // forum-core is a core app
    await queryRunner.query(`
      UPDATE app_registry
      SET type = 'core', dependencies = '{}'::jsonb
      WHERE "appId" = 'forum-core'
    `);

    // forum-neture is an extension app that depends on forum-core
    await queryRunner.query(`
      UPDATE app_registry
      SET type = 'extension', dependencies = '{"forum-core": ">=1.0.0"}'::jsonb
      WHERE "appId" = 'forum-neture'
    `);

    // forum-yaksa is an extension app that depends on forum-core
    await queryRunner.query(`
      UPDATE app_registry
      SET type = 'extension', dependencies = '{"forum-core": ">=1.0.0"}'::jsonb
      WHERE "appId" = 'forum-yaksa'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('app_registry', 'IDX_app_registry_type');

    // Drop columns
    await queryRunner.dropColumn('app_registry', 'dependencies');
    await queryRunner.dropColumn('app_registry', 'type');
  }
}
