import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * CreateMembershipYaksaTables Migration
 *
 * Creates all tables for Membership-Yaksa extension:
 * - yaksa_members: Member information
 * - yaksa_member_categories: Member categories (정회원, 준회원, etc.)
 * - yaksa_member_affiliations: Organization affiliations
 * - yaksa_membership_roles: Role assignments
 * - yaksa_membership_years: Annual membership fee records
 * - yaksa_member_verifications: Verification workflow
 */
export class CreateMembershipYaksaTables1733458800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create yaksa_member_categories table (no foreign keys)
    await queryRunner.createTable(
      new Table({
        name: 'yaksa_member_categories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'requiresAnnualFee',
            type: 'boolean',
            default: true,
          },
          {
            name: 'annualFeeAmount',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'sortOrder',
            type: 'integer',
            default: 0,
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
          },
        ],
      }),
      true
    );

    // 2. Create yaksa_members table
    await queryRunner.createTable(
      new Table({
        name: 'yaksa_members',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'licenseNumber',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'birthdate',
            type: 'date',
          },
          {
            name: 'isVerified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'categoryId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'pharmacyName',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'pharmacyAddress',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
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
          },
        ],
      }),
      true
    );

    // Add indexes for yaksa_members
    await queryRunner.createIndex(
      'yaksa_members',
      new TableIndex({
        name: 'IDX_yaksa_members_userId',
        columnNames: ['userId'],
      })
    );

    await queryRunner.createIndex(
      'yaksa_members',
      new TableIndex({
        name: 'IDX_yaksa_members_organizationId',
        columnNames: ['organizationId'],
      })
    );

    await queryRunner.createIndex(
      'yaksa_members',
      new TableIndex({
        name: 'IDX_yaksa_members_licenseNumber',
        columnNames: ['licenseNumber'],
      })
    );

    await queryRunner.createIndex(
      'yaksa_members',
      new TableIndex({
        name: 'IDX_yaksa_members_isVerified',
        columnNames: ['isVerified'],
      })
    );

    // 3. Create yaksa_member_affiliations table
    await queryRunner.createTable(
      new Table({
        name: 'yaksa_member_affiliations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'memberId',
            type: 'uuid',
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'position',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'isPrimary',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'startDate',
            type: 'date',
          },
          {
            name: 'endDate',
            type: 'date',
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
          },
        ],
      }),
      true
    );

    // Add indexes for yaksa_member_affiliations
    await queryRunner.createIndex(
      'yaksa_member_affiliations',
      new TableIndex({
        name: 'IDX_yaksa_member_affiliations_memberId',
        columnNames: ['memberId'],
      })
    );

    await queryRunner.createIndex(
      'yaksa_member_affiliations',
      new TableIndex({
        name: 'IDX_yaksa_member_affiliations_organizationId',
        columnNames: ['organizationId'],
      })
    );

    await queryRunner.createIndex(
      'yaksa_member_affiliations',
      new TableIndex({
        name: 'IDX_yaksa_member_affiliations_memberId_organizationId',
        columnNames: ['memberId', 'organizationId'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'yaksa_member_affiliations',
      new TableIndex({
        name: 'IDX_yaksa_member_affiliations_isPrimary',
        columnNames: ['isPrimary'],
      })
    );

    // 4. Create yaksa_membership_roles table
    await queryRunner.createTable(
      new Table({
        name: 'yaksa_membership_roles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'memberId',
            type: 'uuid',
          },
          {
            name: 'role',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'scopeType',
            type: 'varchar',
            length: '50',
            default: "'organization'",
          },
          {
            name: 'scopeId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'validFrom',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'validUntil',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'assignedBy',
            type: 'uuid',
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
          },
        ],
      }),
      true
    );

    // Add indexes for yaksa_membership_roles
    await queryRunner.createIndex(
      'yaksa_membership_roles',
      new TableIndex({
        name: 'IDX_yaksa_membership_roles_memberId',
        columnNames: ['memberId'],
      })
    );

    await queryRunner.createIndex(
      'yaksa_membership_roles',
      new TableIndex({
        name: 'IDX_yaksa_membership_roles_role',
        columnNames: ['role'],
      })
    );

    await queryRunner.createIndex(
      'yaksa_membership_roles',
      new TableIndex({
        name: 'IDX_yaksa_membership_roles_scopeType_scopeId',
        columnNames: ['scopeType', 'scopeId'],
      })
    );

    await queryRunner.createIndex(
      'yaksa_membership_roles',
      new TableIndex({
        name: 'IDX_yaksa_membership_roles_unique',
        columnNames: ['memberId', 'role', 'scopeType', 'scopeId'],
        isUnique: true,
      })
    );

    // 5. Create yaksa_membership_years table
    await queryRunner.createTable(
      new Table({
        name: 'yaksa_membership_years',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'memberId',
            type: 'uuid',
          },
          {
            name: 'year',
            type: 'integer',
          },
          {
            name: 'paid',
            type: 'boolean',
            default: false,
          },
          {
            name: 'paidAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'amount',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'paymentMethod',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'transactionId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'receiptUrl',
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
          },
        ],
      }),
      true
    );

    // Add indexes for yaksa_membership_years
    await queryRunner.createIndex(
      'yaksa_membership_years',
      new TableIndex({
        name: 'IDX_yaksa_membership_years_memberId',
        columnNames: ['memberId'],
      })
    );

    await queryRunner.createIndex(
      'yaksa_membership_years',
      new TableIndex({
        name: 'IDX_yaksa_membership_years_year',
        columnNames: ['year'],
      })
    );

    await queryRunner.createIndex(
      'yaksa_membership_years',
      new TableIndex({
        name: 'IDX_yaksa_membership_years_paid',
        columnNames: ['paid'],
      })
    );

    await queryRunner.createIndex(
      'yaksa_membership_years',
      new TableIndex({
        name: 'IDX_yaksa_membership_years_memberId_year',
        columnNames: ['memberId', 'year'],
        isUnique: true,
      })
    );

    // 6. Create yaksa_member_verifications table
    await queryRunner.createTable(
      new Table({
        name: 'yaksa_member_verifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'memberId',
            type: 'uuid',
          },
          {
            name: 'verifierId',
            type: 'uuid',
          },
          {
            name: 'method',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
          },
          {
            name: 'detail',
            type: 'jsonb',
          },
          {
            name: 'rejectionReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'verifiedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
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
          },
        ],
      }),
      true
    );

    // Add indexes for yaksa_member_verifications
    await queryRunner.createIndex(
      'yaksa_member_verifications',
      new TableIndex({
        name: 'IDX_yaksa_member_verifications_memberId',
        columnNames: ['memberId'],
      })
    );

    await queryRunner.createIndex(
      'yaksa_member_verifications',
      new TableIndex({
        name: 'IDX_yaksa_member_verifications_verifierId',
        columnNames: ['verifierId'],
      })
    );

    await queryRunner.createIndex(
      'yaksa_member_verifications',
      new TableIndex({
        name: 'IDX_yaksa_member_verifications_status',
        columnNames: ['status'],
      })
    );

    // Insert default member categories
    await queryRunner.query(`
      INSERT INTO yaksa_member_categories (id, name, description, "requiresAnnualFee", "annualFeeAmount", "sortOrder")
      VALUES
        (uuid_generate_v4(), '정회원', '정규 면허 소지 및 활동 중인 약사', true, 50000, 1),
        (uuid_generate_v4(), '준회원', '면허 소지 약사 (비활동)', true, 30000, 2),
        (uuid_generate_v4(), '휴업약사', '휴업 중인 약사', false, null, 3),
        (uuid_generate_v4(), '명예회원', '명예 회원', false, null, 4);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (to avoid foreign key issues)
    await queryRunner.dropTable('yaksa_member_verifications', true);
    await queryRunner.dropTable('yaksa_membership_years', true);
    await queryRunner.dropTable('yaksa_membership_roles', true);
    await queryRunner.dropTable('yaksa_member_affiliations', true);
    await queryRunner.dropTable('yaksa_members', true);
    await queryRunner.dropTable('yaksa_member_categories', true);
  }
}
