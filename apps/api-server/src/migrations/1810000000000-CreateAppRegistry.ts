import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAppRegistry1810000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create app_registry table
    await queryRunner.createTable(
      new Table({
        name: 'app_registry',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
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
            name: 'status',
            type: 'enum',
            enum: ['installed', 'active', 'inactive'],
            default: "'installed'",
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
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'app_registry',
      new TableIndex({
        name: 'IDX_app_registry_appId',
        columnNames: ['appId'],
      }),
    );

    await queryRunner.createIndex(
      'app_registry',
      new TableIndex({
        name: 'IDX_app_registry_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('app_registry');
  }
}
