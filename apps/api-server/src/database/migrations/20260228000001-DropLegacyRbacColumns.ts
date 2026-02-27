/**
 * WO-ROLE-NORMALIZATION-PHASE3-E-PR2-LEGACY-DROP-V1
 *
 * Legacy RBAC 구조를 DB에서 물리적으로 제거한다.
 *
 * 전제 조건:
 * - Phase3-E PR1에서 Runtime이 role_assignments 단일화 완료
 * - User 엔티티에서 @Column role/roles 데코레이터 제거 완료
 * - role-shim.utils.ts가 런타임에서 role/roles를 role_assignments 기반으로 채움
 *
 * 제거 대상:
 * 1. user_roles 테이블 (Many-to-Many bridge)
 * 2. users.roles 컬럼 (Legacy text[] array)
 * 3. users.role 컬럼 (Legacy enum)
 *
 * 완료 후 구조:
 *   users                   → Identity ONLY
 *   role_assignments        → RBAC ONLY
 *   organization_members    → BusinessRole
 *   kpa_pharmacist_profiles → Qualification
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLegacyRbacColumns20260228000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Bridge table 제거
    await queryRunner.query(`
      DROP TABLE IF EXISTS user_roles
    `);

    // 2. users.roles 컬럼 제거 (text[] array)
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS roles
    `);

    // 3. users.role 컬럼 제거 (enum)
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS role
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 3. users.role 복원
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
          CREATE TYPE users_role_enum AS ENUM (
            'super_admin', 'admin', 'vendor', 'seller', 'user',
            'business', 'partner', 'supplier', 'manager', 'customer'
          );
        END IF;
      END$$
    `);
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role users_role_enum NOT NULL DEFAULT 'user'
    `);

    // 2. users.roles 복원
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT ARRAY['user']::text[]
    `);

    // 1. user_roles 테이블 복원
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      )
    `);
  }
}
