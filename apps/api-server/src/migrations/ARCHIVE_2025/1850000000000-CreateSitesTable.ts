import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSitesTable1850000000000 implements MigrationInterface {
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
            default: 'uuid_generate_v4()',
          },
          {
            name: 'domain',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
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
            length: '100',
          },
          {
            name: 'apps',
            type: 'text',
            comment: 'Comma-separated list of installed apps',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
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
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'sites',
      new TableIndex({
        name: 'IDX_sites_domain',
        columnNames: ['domain'],
      })
    );

    await queryRunner.createIndex(
      'sites',
      new TableIndex({
        name: 'IDX_sites_status',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'sites',
      new TableIndex({
        name: 'IDX_sites_template',
        columnNames: ['template'],
      })
    );

    await queryRunner.createIndex(
      'sites',
      new TableIndex({
        name: 'IDX_sites_created_at',
        columnNames: ['createdAt'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('sites', 'IDX_sites_created_at');
    await queryRunner.dropIndex('sites', 'IDX_sites_template');
    await queryRunner.dropIndex('sites', 'IDX_sites_status');
    await queryRunner.dropIndex('sites', 'IDX_sites_domain');

    // Drop table
    await queryRunner.dropTable('sites');
  }
}
