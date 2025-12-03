import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSitesTable9000000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create sites table
    await queryRunner.createTable(
      new Table({
        name: 'sites',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'domain',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'template',
            type: 'varchar',
            isNullable: false,
            default: "'default'",
          },
          {
            name: 'apps',
            type: 'text',
            isNullable: false,
            default: "''",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'scaffolding', 'deploying', 'ready', 'failed'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'deploymentId',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'logs',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create index on domain for faster lookups
    await queryRunner.createIndex(
      'sites',
      new TableIndex({
        name: 'IDX_sites_domain',
        columnNames: ['domain'],
      }),
    );

    // Create index on status for filtering
    await queryRunner.createIndex(
      'sites',
      new TableIndex({
        name: 'IDX_sites_status',
        columnNames: ['status'],
      }),
    );

    // Create index on createdAt for sorting
    await queryRunner.createIndex(
      'sites',
      new TableIndex({
        name: 'IDX_sites_createdAt',
        columnNames: ['createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.dropIndex('sites', 'IDX_sites_createdAt');
    await queryRunner.dropIndex('sites', 'IDX_sites_status');
    await queryRunner.dropIndex('sites', 'IDX_sites_domain');

    // Drop table
    await queryRunner.dropTable('sites');
  }
}
