import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create cosmetics_members table
 *
 * WO-O4O-KCOS-COSMETICS-MEMBER-PROFILE-FOUNDATION-V1
 *   K-Cosmetics 회원 프로필 분류 (sub_role) 도입.
 *
 *   - membership_type: 'cosmetics_member' (v1 단일)
 *   - sub_role: 'store_owner' | 'store_staff' (CHECK 제약)
 *   - 1 user : 1 member (UNIQUE user_id)
 *   - soft delete 지원
 *
 * 패턴: glycopharm_members table (CreateGlycopharmMembersTable20260415280000) mirror
 *       + sub_role CHECK 제약 추가 (사용자 directive — IR §9.1).
 *
 * 본 entity 의 sub_role 은 권한 role 이 아닌 profile classification. cosmetics:store_owner
 * role (role_assignments) 과 명확히 다른 layer (IR-O4O-SERVICE-MEMBER-PROFILE-CLASSIFICATION-V1 §5).
 */
export class CreateCosmeticsMembersTable20260524083827 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'cosmetics_members',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'user_id', type: 'uuid', isNullable: false },
          {
            name: 'membership_type',
            type: 'varchar',
            length: '50',
            default: "'cosmetics_member'",
            isNullable: false,
          },
          { name: 'sub_role', type: 'varchar', length: '50', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'active'", isNullable: false },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    // UNIQUE: 1 user : 1 cosmetics_member
    await queryRunner.createIndex(
      'cosmetics_members',
      new TableIndex({
        name: 'UQ_cosmetics_members_user_id',
        columnNames: ['user_id'],
        isUnique: true,
      }),
    );

    // Index: status (활성/정지 조회)
    await queryRunner.createIndex(
      'cosmetics_members',
      new TableIndex({
        name: 'IDX_cosmetics_members_status',
        columnNames: ['status'],
      }),
    );

    // Index: sub_role (매장 경영자/근무자 필터)
    await queryRunner.createIndex(
      'cosmetics_members',
      new TableIndex({
        name: 'IDX_cosmetics_members_sub_role',
        columnNames: ['sub_role'],
      }),
    );

    // FK: user_id → users(id) CASCADE
    await queryRunner.createForeignKey(
      'cosmetics_members',
      new TableForeignKey({
        name: 'FK_cosmetics_members_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // CHECK: sub_role enum 제약 (사용자 directive — IR §9.1)
    //   NULL 허용 (sub_role 미지정 상태도 가능, 추후 운영자가 PATCH 로 부여)
    await queryRunner.query(`
      ALTER TABLE cosmetics_members
      ADD CONSTRAINT CK_cosmetics_members_sub_role
      CHECK (sub_role IS NULL OR sub_role IN ('store_owner', 'store_staff'))
    `);

    // CHECK: status enum 제약
    await queryRunner.query(`
      ALTER TABLE cosmetics_members
      ADD CONSTRAINT CK_cosmetics_members_status
      CHECK (status IN ('active', 'suspended', 'withdrawn'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('cosmetics_members', true);
  }
}
