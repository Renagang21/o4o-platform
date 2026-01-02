import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create glycopharm_applications table
 *
 * Phase B-1: Glycopharm API Implementation
 * Table for pharmacy participation/service application workflow
 */
export class CreateGlycopharmApplicationsTable9990000000000 implements MigrationInterface {
  name = 'CreateGlycopharmApplicationsTable9990000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create glycopharm_applications table
    await queryRunner.createTable(
      new Table({
        name: 'glycopharm_applications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'organization_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'organization_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'business_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'service_types',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
          },
          {
            name: 'note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'submitted'",
          },
          {
            name: 'rejection_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'submitted_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'decided_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'decided_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Create index on user_id for fast lookup
    await queryRunner.createIndex(
      'glycopharm_applications',
      new TableIndex({
        name: 'IDX_glycopharm_applications_user_id',
        columnNames: ['user_id'],
      })
    );

    // Create index on status for filtering
    await queryRunner.createIndex(
      'glycopharm_applications',
      new TableIndex({
        name: 'IDX_glycopharm_applications_status',
        columnNames: ['status'],
      })
    );

    // Create composite index for user + status
    await queryRunner.createIndex(
      'glycopharm_applications',
      new TableIndex({
        name: 'IDX_glycopharm_applications_user_status',
        columnNames: ['user_id', 'status'],
      })
    );

    // Create foreign key to users table
    await queryRunner.createForeignKey(
      'glycopharm_applications',
      new TableForeignKey({
        name: 'FK_glycopharm_applications_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey(
      'glycopharm_applications',
      'FK_glycopharm_applications_user_id'
    );

    // Drop indexes
    await queryRunner.dropIndex(
      'glycopharm_applications',
      'IDX_glycopharm_applications_user_status'
    );
    await queryRunner.dropIndex(
      'glycopharm_applications',
      'IDX_glycopharm_applications_status'
    );
    await queryRunner.dropIndex(
      'glycopharm_applications',
      'IDX_glycopharm_applications_user_id'
    );

    // Drop table
    await queryRunner.dropTable('glycopharm_applications');
  }
}
