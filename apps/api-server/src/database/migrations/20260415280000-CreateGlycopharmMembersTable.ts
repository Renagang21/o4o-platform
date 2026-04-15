import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create glycopharm_members table
 *
 * WO-GLYCOPHARM-MEMBER-TABLE-CREATION-V1
 * GlycoPharm 약사 회원 전용 테이블
 * - membership_type: 'pharmacist' (v1 단일)
 * - sub_role: 'pharmacy_owner' | 'staff_pharmacist'
 * - 1 user : 1 member (UNIQUE user_id)
 * - soft delete 지원
 */
export class CreateGlycopharmMembersTable20260415280000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'glycopharm_members',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'user_id', type: 'uuid', isNullable: false },
          { name: 'membership_type', type: 'varchar', length: '50', default: "'pharmacist'", isNullable: false },
          { name: 'sub_role', type: 'varchar', length: '50', isNullable: true },
          { name: 'organization_id', type: 'uuid', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'pending'", isNullable: false },
          { name: 'approved_by', type: 'uuid', isNullable: true },
          { name: 'approved_at', type: 'timestamp with time zone', isNullable: true },
          { name: 'rejection_reason', type: 'text', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    // UNIQUE: 1 user : 1 member
    await queryRunner.createIndex(
      'glycopharm_members',
      new TableIndex({
        name: 'UQ_glycopharm_members_user_id',
        columnNames: ['user_id'],
        isUnique: true,
      }),
    );

    // Index: status (승인 대기 조회 등)
    await queryRunner.createIndex(
      'glycopharm_members',
      new TableIndex({
        name: 'IDX_glycopharm_members_status',
        columnNames: ['status'],
      }),
    );

    // Index: organization_id (약국별 회원 조회)
    await queryRunner.createIndex(
      'glycopharm_members',
      new TableIndex({
        name: 'IDX_glycopharm_members_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    // FK: user_id → users(id)
    await queryRunner.createForeignKey(
      'glycopharm_members',
      new TableForeignKey({
        name: 'FK_glycopharm_members_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // FK: organization_id → organizations(id)
    await queryRunner.createForeignKey(
      'glycopharm_members',
      new TableForeignKey({
        name: 'FK_glycopharm_members_organization_id',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('glycopharm_members', true);
  }
}
