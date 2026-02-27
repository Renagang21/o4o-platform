/**
 * Migration: Backfill role_assignments from users.role / users.roles
 *
 * WO-ROLE-NORMALIZATION-PHASE3-E-PR2-LEGACY-DROP-V1 (전제 조건)
 *
 * 배경:
 *   - Task C (9b1d07b7c) 이후 requireAdmin/requireRole이 role_assignments 테이블만 참조
 *   - 기존 사용자(admin, super_admin 등)는 users.role 컬럼에만 역할이 있고
 *     role_assignments에는 레코드가 없어 접근 거부 발생
 *
 * 수행:
 *   users.role IN ('admin','super_admin','operator','vendor','seller','supplier','partner','manager')
 *   이면서 role_assignments에 해당 active 레코드가 없는 경우 자동 삽입
 *
 * 실행 순서:
 *   20260228000000 (본 마이그레이션) → 20260228000001 (DropLegacyRbacColumns)
 *
 * 멱등성: ON CONFLICT DO NOTHING으로 중복 삽입 방지
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillRoleAssignmentsFromLegacyRole20260228000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // users.role 컬럼이 아직 존재하는지 확인 (Drop migration 이전에만 실행 가능)
    const hasRoleColumn = await queryRunner.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name = 'role'
      LIMIT 1
    `);

    if (!hasRoleColumn || hasRoleColumn.length === 0) {
      console.log('[Migration] BackfillRoleAssignments: users.role 컬럼 없음 — 이미 drop됨. 건너뜀.');
      return;
    }

    // 1. users.role 단일 역할 백필
    //    non-user 역할을 가진 사용자 중 role_assignments 미등록자를 삽입
    const result = await queryRunner.query(`
      INSERT INTO role_assignments (
        id,
        user_id,
        role,
        is_active,
        valid_from,
        valid_until,
        assigned_at,
        assigned_by,
        scope_type,
        scope_id,
        created_at,
        updated_at
      )
      SELECT
        gen_random_uuid(),
        u.id,
        u.role,
        true,
        NOW(),
        NULL,
        NOW(),
        NULL,
        'global',
        NULL,
        NOW(),
        NOW()
      FROM users u
      WHERE u.role IS NOT NULL
        AND u.role NOT IN ('user', 'customer', 'guest')
        AND u."isActive" = true
        AND NOT EXISTS (
          SELECT 1
          FROM role_assignments ra
          WHERE ra.user_id = u.id
            AND ra.role = u.role
            AND ra.is_active = true
        )
      ON CONFLICT DO NOTHING
    `);

    const count1 = Array.isArray(result) ? result.length : 0;
    console.log(`[Migration] BackfillRoleAssignments: ${count1}개의 기본 역할 삽입 (users.role)`);

    // 2. users.roles 배열의 추가 역할 백필 (예: 'platform:super_admin' 등)
    //    users.roles 컬럼이 존재하는 경우에만 실행
    const hasRolesColumn = await queryRunner.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name = 'roles'
      LIMIT 1
    `);

    if (hasRolesColumn && hasRolesColumn.length > 0) {
      const result2 = await queryRunner.query(`
        INSERT INTO role_assignments (
          id,
          user_id,
          role,
          is_active,
          valid_from,
          valid_until,
          assigned_at,
          assigned_by,
          scope_type,
          scope_id,
          created_at,
          updated_at
        )
        SELECT
          gen_random_uuid(),
          u.id,
          unnested_role,
          true,
          NOW(),
          NULL,
          NOW(),
          NULL,
          'global',
          NULL,
          NOW(),
          NOW()
        FROM users u
        CROSS JOIN LATERAL unnest(u.roles) AS unnested_role
        WHERE u.roles IS NOT NULL
          AND array_length(u.roles, 1) > 0
          AND unnested_role NOT IN ('user', 'customer', 'guest')
          AND u."isActive" = true
          AND NOT EXISTS (
            SELECT 1
            FROM role_assignments ra
            WHERE ra.user_id = u.id
              AND ra.role = unnested_role
              AND ra.is_active = true
          )
        ON CONFLICT DO NOTHING
      `);

      const count2 = Array.isArray(result2) ? result2.length : 0;
      console.log(`[Migration] BackfillRoleAssignments: ${count2}개의 추가 역할 삽입 (users.roles 배열)`);
    }

    // 3. 결과 요약 로그
    const summary = await queryRunner.query(`
      SELECT role, COUNT(*)::int AS cnt
      FROM role_assignments
      WHERE is_active = true
        AND role NOT IN ('user', 'customer', 'guest')
      GROUP BY role
      ORDER BY cnt DESC
    `);
    console.log('[Migration] BackfillRoleAssignments 완료. role_assignments 현황:', summary);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 백필된 레코드를 특정하기 어려우므로 down은 no-op
    console.log('[Migration] BackfillRoleAssignments down: no-op');
  }
}
