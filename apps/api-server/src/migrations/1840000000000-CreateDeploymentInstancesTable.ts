import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateDeploymentInstancesTable1840000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create deployment_instances table
    await queryRunner.createTable(
      new Table({
        name: 'deployment_instances',
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
            name: 'ipAddress',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'instanceId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'region',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'instanceType',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'logs',
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
      'deployment_instances',
      new TableIndex({
        name: 'IDX_deployment_instances_domain',
        columnNames: ['domain'],
      })
    );

    await queryRunner.createIndex(
      'deployment_instances',
      new TableIndex({
        name: 'IDX_deployment_instances_status',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'deployment_instances',
      new TableIndex({
        name: 'IDX_deployment_instances_created_at',
        columnNames: ['createdAt'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('deployment_instances', 'IDX_deployment_instances_created_at');
    await queryRunner.dropIndex('deployment_instances', 'IDX_deployment_instances_status');
    await queryRunner.dropIndex('deployment_instances', 'IDX_deployment_instances_domain');

    // Drop table
    await queryRunner.dropTable('deployment_instances');
  }
}
