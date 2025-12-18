/**
 * Migration: Create member_profiles table
 *
 * @package @o4o-apps/member-yaksa
 * @phase 1
 */

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMemberProfile1734500000001 implements MigrationInterface {
  name = 'CreateMemberProfile1734500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create member_profiles table
    await queryRunner.createTable(
      new Table({
        name: 'member_profiles',
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
            name: 'pharmacistLicenseNumber',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'occupationType',
            type: 'varchar',
            length: '30',
            default: "'OWNER_PHARMACIST'",
          },
          {
            name: 'pharmacyName',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'pharmacyAddress',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'pharmacyPhone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'hospitalName',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'agencyName',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'companyName',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'profileStatus',
            type: 'varchar',
            length: '30',
            default: "'active'",
          },
          {
            name: 'completionRate',
            type: 'int',
            default: 0,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
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
          {
            name: 'lastProfileUpdateAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'member_profiles',
      new TableIndex({
        name: 'IDX_member_profiles_userId',
        columnNames: ['userId'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'member_profiles',
      new TableIndex({
        name: 'IDX_member_profiles_occupationType',
        columnNames: ['occupationType'],
      })
    );

    await queryRunner.createIndex(
      'member_profiles',
      new TableIndex({
        name: 'IDX_member_profiles_pharmacistLicenseNumber',
        columnNames: ['pharmacistLicenseNumber'],
      })
    );

    await queryRunner.createIndex(
      'member_profiles',
      new TableIndex({
        name: 'IDX_member_profiles_profileStatus',
        columnNames: ['profileStatus'],
      })
    );

    console.log('[member-yaksa] Migration: member_profiles table created');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('member_profiles', 'IDX_member_profiles_profileStatus');
    await queryRunner.dropIndex('member_profiles', 'IDX_member_profiles_pharmacistLicenseNumber');
    await queryRunner.dropIndex('member_profiles', 'IDX_member_profiles_occupationType');
    await queryRunner.dropIndex('member_profiles', 'IDX_member_profiles_userId');

    // Drop table
    await queryRunner.dropTable('member_profiles');

    console.log('[member-yaksa] Migration: member_profiles table dropped');
  }
}

export default CreateMemberProfile1734500000001;
