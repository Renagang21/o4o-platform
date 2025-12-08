import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * P3: Role Applications Migration
 *
 * Creates role_applications table for managing user role application workflow
 * - Users submit applications for seller, supplier, partner roles
 * - Admins review and approve/reject
 * - Approved applications create RoleAssignments
 *
 * Zero-Data Safe: New table creation only
 * Created: 2025-01-17
 */
export class CreateRoleApplications1800000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'role_applications',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          generationStrategy: 'uuid',
          default: 'uuid_generate_v4()',
        },
        {
          name: 'user_id',
          type: 'uuid',
          isNullable: false,
          comment: 'FK to users table',
        },
        {
          name: 'role',
          type: 'varchar',
          length: '50',
          isNullable: false,
          comment: 'Requested role: seller, supplier, partner, etc.',
        },
        {
          name: 'status',
          type: 'varchar',
          length: '20',
          default: "'pending'",
          isNullable: false,
          comment: 'Application status: pending, approved, rejected',
        },
        {
          name: 'business_name',
          type: 'varchar',
          length: '100',
          isNullable: true,
          comment: 'Business name provided by applicant',
        },
        {
          name: 'business_number',
          type: 'varchar',
          length: '100',
          isNullable: true,
          comment: 'Business registration number',
        },
        {
          name: 'note',
          type: 'text',
          isNullable: true,
          comment: 'Additional notes from applicant',
        },
        {
          name: 'metadata',
          type: 'jsonb',
          isNullable: true,
          comment: 'Additional application data (extensible)',
        },
        {
          name: 'applied_at',
          type: 'timestamp with time zone',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false,
          comment: 'When the application was submitted',
        },
        {
          name: 'decided_at',
          type: 'timestamp with time zone',
          isNullable: true,
          comment: 'When the application was approved/rejected',
        },
        {
          name: 'decided_by',
          type: 'varchar',
          length: '50',
          isNullable: true,
          comment: 'Admin user ID or email who made the decision',
        },
        {
          name: 'created_at',
          type: 'timestamp with time zone',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false,
        },
        {
          name: 'updated_at',
          type: 'timestamp with time zone',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false,
        },
      ],
    }), true);

    // Add foreign key to users table
    await queryRunner.createForeignKey('role_applications', new TableForeignKey({
      columnNames: ['user_id'],
      referencedTableName: 'users',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      name: 'fk_role_applications_user',
    }));

    // Add index for user_id + role (prevent duplicate pending applications)
    await queryRunner.createIndex('role_applications', new TableIndex({
      name: 'idx_role_applications_user_role',
      columnNames: ['user_id', 'role'],
    }));

    // Add index for status (for admin filtering)
    await queryRunner.createIndex('role_applications', new TableIndex({
      name: 'idx_role_applications_status',
      columnNames: ['status', 'applied_at'],
    }));

    // Add partial index for pending applications
    await queryRunner.createIndex('role_applications', new TableIndex({
      name: 'idx_role_applications_pending',
      columnNames: ['user_id', 'role', 'status'],
      where: "status = 'pending'",
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('role_applications', 'idx_role_applications_pending');
    await queryRunner.dropIndex('role_applications', 'idx_role_applications_status');
    await queryRunner.dropIndex('role_applications', 'idx_role_applications_user_role');

    // Drop foreign key
    await queryRunner.dropForeignKey('role_applications', 'fk_role_applications_user');

    // Drop table
    await queryRunner.dropTable('role_applications');
  }
}
