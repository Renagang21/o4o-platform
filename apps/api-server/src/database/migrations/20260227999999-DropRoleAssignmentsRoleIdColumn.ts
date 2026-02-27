/**
 * Fix: Drop legacy roleId column from role_assignments
 *
 * 배경:
 *   이전 TypeORM synchronize가 role_assignments 테이블을 생성할 때
 *   `roleId UUID NOT NULL`(roles 테이블 FK)을 추가했음.
 *   현재 RoleAssignment 엔티티는 `role VARCHAR(50)`을 사용하므로
 *   이 레거시 컬럼이 INSERT 시 NOT NULL 위반을 일으킴.
 *
 * 실행 순서:
 *   이 마이그레이션(20260227999999) →
 *   BackfillRoleAssignmentsFromLegacyRole(20260228000000) →
 *   DropLegacyRbacColumns(20260228000001)
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropRoleAssignmentsRoleIdColumn20260227999999 implements MigrationInterface {
  name = 'DropRoleAssignmentsRoleIdColumn20260227999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop legacy roleId UUID FK column (camelCase — from old TypeORM synchronize)
    await queryRunner.query(`
      ALTER TABLE role_assignments DROP COLUMN IF EXISTS "roleId"
    `);

    // Also drop role_id UUID column if it was renamed from roleId by CreateRoleAssignmentsTable
    // (Only drop if it's UUID type — our intended role_id doesn't exist in this table)
    const roleIdUuidCol = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'role_assignments'
        AND column_name = 'role_id'
        AND data_type = 'uuid'
      LIMIT 1
    `);

    if (roleIdUuidCol && roleIdUuidCol.length > 0) {
      await queryRunner.query(`
        ALTER TABLE role_assignments DROP COLUMN IF EXISTS "role_id"
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op: restoring legacy columns is not needed
  }
}
