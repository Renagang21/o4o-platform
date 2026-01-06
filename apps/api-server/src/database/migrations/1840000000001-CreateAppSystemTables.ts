import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAppSystemTables1840000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create apps table
    await queryRunner.createTable(
      new Table({
        name: 'apps',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isUnique: true
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50'
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50'
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['integration', 'block', 'shortcode', 'widget', 'workflow'],
            default: "'integration'"
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'version',
            type: 'varchar',
            length: '20',
            default: "'1.0.0'"
          },
          {
            name: 'manifest',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'deprecated'],
            default: "'active'"
          },
          {
            name: 'isSystem',
            type: 'boolean',
            default: false
          },
          {
            name: 'author',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'repositoryUrl',
            type: 'varchar',
            length: '255',
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

    // Create app_instances table
    await queryRunner.createTable(
      new Table({
        name: 'app_instances',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'appId',
            type: 'uuid'
          },
          {
            name: 'businessId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'suspended'],
            default: "'active'"
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'usageCount',
            type: 'integer',
            default: 0
          },
          {
            name: 'installedAt',
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
            name: 'FK_app_instances_app',
            columnNames: ['appId'],
            referencedTableName: 'apps',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create app_usage_logs table
    await queryRunner.createTable(
      new Table({
        name: 'app_usage_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'appId',
            type: 'uuid'
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'businessId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'action',
            type: 'varchar',
            length: '100'
          },
          {
            name: 'inputTokens',
            type: 'integer',
            isNullable: true
          },
          {
            name: 'outputTokens',
            type: 'integer',
            isNullable: true
          },
          {
            name: 'durationMs',
            type: 'integer',
            isNullable: true
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'success'"
          },
          {
            name: 'errorType',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true
          },
          {
            name: 'requestId',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'model',
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
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ],
        foreignKeys: [
          {
            name: 'FK_app_usage_logs_app',
            columnNames: ['appId'],
            referencedTableName: 'apps',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'apps',
      new TableIndex({
        name: 'IDX_apps_provider_category',
        columnNames: ['provider', 'category']
      })
    );

    await queryRunner.createIndex(
      'apps',
      new TableIndex({
        name: 'IDX_apps_status',
        columnNames: ['status']
      })
    );

    await queryRunner.createIndex(
      'app_instances',
      new TableIndex({
        name: 'IDX_app_instances_app_business',
        columnNames: ['appId', 'businessId']
      })
    );

    await queryRunner.createIndex(
      'app_usage_logs',
      new TableIndex({
        name: 'IDX_app_usage_logs_app_created',
        columnNames: ['appId', 'createdAt']
      })
    );

    await queryRunner.createIndex(
      'app_usage_logs',
      new TableIndex({
        name: 'IDX_app_usage_logs_business_created',
        columnNames: ['businessId', 'createdAt']
      })
    );

    await queryRunner.createIndex(
      'app_usage_logs',
      new TableIndex({
        name: 'IDX_app_usage_logs_user_created',
        columnNames: ['userId', 'createdAt']
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('app_usage_logs', 'IDX_app_usage_logs_user_created');
    await queryRunner.dropIndex('app_usage_logs', 'IDX_app_usage_logs_business_created');
    await queryRunner.dropIndex('app_usage_logs', 'IDX_app_usage_logs_app_created');
    await queryRunner.dropIndex('app_instances', 'IDX_app_instances_app_business');
    await queryRunner.dropIndex('apps', 'IDX_apps_status');
    await queryRunner.dropIndex('apps', 'IDX_apps_provider_category');

    // Drop tables
    await queryRunner.dropTable('app_usage_logs');
    await queryRunner.dropTable('app_instances');
    await queryRunner.dropTable('apps');
  }
}
