/**
 * RBAC DB Audit Endpoint
 *
 * WO-RBAC-DB-AUDIT-JSON-ENDPOINT-V1
 *
 * Phase 5B Step 1 전용 진단 엔드포인트.
 * GET /__debug__/rbac-db-audit
 *
 * 제약:
 * - 인증 불필요
 * - SELECT만 실행 (UPDATE/DELETE 절대 금지)
 * - 운영 중 안전하게 호출 가능
 * - 캐싱 없음 (매 호출마다 최신 DB 상태 반환)
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';

export function createRbacDbAuditRouter(dataSource: DataSource): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response): Promise<void> => {
    const base = {
      timestamp: new Date().toISOString(),
      warning: 'READ-ONLY diagnostic endpoint. No data is modified.',
      purpose: 'WO-ROLE-PHILOSOPHY-PHASE5B-STEP1-DB-AUDIT-V1',
    };

    if (!dataSource.isInitialized) {
      res.status(503).json({ ...base, error: 'Database not initialized yet', code: 'DB_NOT_READY' });
      return;
    }

    try {
      // ① 전체 role 분포 (active/inactive 구분)
      const roleDistribution: Array<{ role: string; total: number; active: number; inactive: number }> =
        await dataSource.query(`
          SELECT
            role,
            COUNT(*)::int        AS total,
            SUM(CASE WHEN is_active     THEN 1 ELSE 0 END)::int AS active,
            SUM(CASE WHEN NOT is_active THEN 1 ELSE 0 END)::int AS inactive
          FROM role_assignments
          GROUP BY role
          ORDER BY active DESC
        `);

      // ② 이상 값 존재 여부 (migration에서 할당 없었던 값)
      const unexpectedRoles: Array<{ role: string; count: number }> =
        await dataSource.query(`
          SELECT role, COUNT(*)::int AS count
          FROM role_assignments
          WHERE role IN (
            'administrator', 'superadmin', 'staff',
            'vendor_manager', 'beta_user',
            'kpa-c:operator', 'kpa-c:branch_admin', 'kpa-c:branch_operator'
          )
          GROUP BY role
          ORDER BY role
        `);

      // ③ 활성 사용자 중 RA 없는 사용자 수 (백필 갭)
      const [noRaRow] = await dataSource.query(`
        SELECT COUNT(*)::int AS count
        FROM users u
        WHERE u."isActive" = true
          AND NOT EXISTS (
            SELECT 1
            FROM role_assignments ra
            WHERE ra.user_id = u.id
              AND ra.is_active = true
          )
      `);

      // ④ users.role / users.roles 컬럼 존재 여부 (DropLegacy 실행 여부)
      const columnCheck: Array<{ column_name: string; data_type: string }> =
        await dataSource.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = 'users'
            AND column_name IN ('role', 'roles')
        `);

      const usersRoleColumnExists  = columnCheck.some(r => r.column_name === 'role');
      const usersRolesColumnExists = columnCheck.some(r => r.column_name === 'roles');

      let migrationInterpretation: string;
      if (usersRoleColumnExists && usersRolesColumnExists) {
        migrationInterpretation = 'DropLegacyRbacColumns NOT YET EXECUTED (both columns exist)';
      } else if (!usersRoleColumnExists && !usersRolesColumnExists) {
        migrationInterpretation = 'DropLegacyRbacColumns EXECUTED (both columns dropped)';
      } else {
        migrationInterpretation = 'PARTIAL STATE — check manually';
      }

      // ④-b business 갭 확인 (users.role 컬럼이 존재하는 경우만)
      let businessGapCount: number | null = null;
      if (usersRoleColumnExists) {
        const [bgRow] = await dataSource.query(`
          SELECT COUNT(*)::int AS count
          FROM users u
          WHERE u.role = 'business'
            AND u."isActive" = true
            AND NOT EXISTS (
              SELECT 1
              FROM role_assignments ra
              WHERE ra.user_id = u.id
                AND ra.role = 'business'
                AND ra.is_active = true
            )
        `);
        businessGapCount = bgRow?.count ?? 0;
      }

      // ⑤ scope_type 분포
      const scopeDistribution: Array<{ scope_type: string; scope_id_null: boolean; count: number }> =
        await dataSource.query(`
          SELECT
            scope_type,
            (scope_id IS NULL) AS scope_id_null,
            COUNT(*)::int AS count
          FROM role_assignments
          GROUP BY scope_type, (scope_id IS NULL)
          ORDER BY count DESC
        `);

      // ⑥ 전체 요약
      const [summary] = await dataSource.query(`
        SELECT
          (SELECT COUNT(*)::int FROM users WHERE "isActive" = true)                            AS total_active_users,
          (SELECT COUNT(DISTINCT user_id)::int FROM role_assignments WHERE is_active = true)   AS users_with_active_ra,
          (SELECT COUNT(*)::int FROM role_assignments WHERE is_active = true)                   AS total_active_ra_records,
          (SELECT COUNT(DISTINCT role)::int FROM role_assignments WHERE is_active = true)       AS distinct_role_values
      `);

      res.json({
        ...base,
        summary,
        roleDistribution,
        unexpectedRoles,
        usersWithoutActiveRoleAssignment: noRaRow?.count ?? 0,
        migrationStatus: {
          usersRoleColumnExists,
          usersRolesColumnExists,
          interpretation: migrationInterpretation,
        },
        businessGap: {
          count: businessGapCount,
          note: usersRoleColumnExists
            ? 'Count of users with role=business in users table but no RA record'
            : 'Cannot check: users.role column already dropped (DropLegacyRbacColumns executed)',
        },
        scopeDistribution,
      });
    } catch (error: any) {
      res.status(500).json({
        ...base,
        error: error.message,
        code: 'AUDIT_QUERY_FAILED',
      });
    }
  });

  return router;
}
