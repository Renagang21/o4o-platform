/**
 * User Debug Info Endpoint
 *
 * GET /__debug__/user?email=someone@example.com
 *
 * WO-O4O-DEBUG-USER-JSON-PAGE-V1
 *
 * 특정 이메일 기준으로 모든 서비스 상태를 한 번에 확인:
 * - users 존재 여부
 * - service_memberships (전체 서비스)
 * - role_assignments
 * - 로그인 판정 기준 (pending 여부)
 *
 * 제약:
 * - DEBUG_MODE + /__debug__/ 경로로만 접근 가능
 * - SELECT만 실행 (UPDATE/DELETE 절대 금지)
 * - 운영 중 안전하게 호출 가능
 * - TODO: 진단 완료 후 admin only guard 추가 예정
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';

export function createUserDebugRouter(dataSource: DataSource): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response): Promise<void> => {
    const base = {
      timestamp: new Date().toISOString(),
      warning: 'READ-ONLY diagnostic endpoint. No data is modified.',
    };

    if (!dataSource.isInitialized) {
      res.status(503).json({ ...base, error: 'Database not initialized yet' });
      return;
    }

    const email = (req.query.email as string) || '';
    if (!email) {
      res.status(400).json({ ...base, error: 'email query parameter required (e.g. ?email=user@example.com)' });
      return;
    }

    try {
      // 1. User 조회
      const users = await dataSource.query(`
        SELECT
          id, email, "firstName", "lastName", name, nickname, phone,
          status, "isActive", "isEmailVerified",
          service_key,
          "createdAt", "lastLoginAt"
        FROM users
        WHERE email = $1
        LIMIT 1
      `, [email]);

      const user = users[0] || null;

      if (!user) {
        res.json({ ...base, email, user: null, message: 'User not found' });
        return;
      }

      // 2. Service Memberships 조회
      const memberships = await dataSource.query(`
        SELECT
          id, user_id, service_key, status, role,
          approved_by, approved_at, rejection_reason,
          created_at, updated_at
        FROM service_memberships
        WHERE user_id = $1
        ORDER BY service_key, created_at DESC
      `, [user.id]);

      // 3. Role Assignments 조회
      const roles = await dataSource.query(`
        SELECT
          id, user_id, role, service_key,
          is_active, granted_by, granted_at, revoked_at
        FROM role_assignments
        WHERE user_id = $1
        ORDER BY is_active DESC, role
      `, [user.id]);

      // 4. Summary 생성
      const serviceKeys = ['neture', 'glycopharm', 'glucoseview', 'kpa-society', 'k-cosmetics'];
      const membershipSummary: Record<string, { exists: boolean; status: string | null; role: string | null }> = {};

      for (const key of serviceKeys) {
        const m = memberships.find((r: any) => r.service_key === key);
        membershipSummary[key] = {
          exists: !!m,
          status: m?.status || null,
          role: m?.role || null,
        };
      }

      res.json({
        ...base,
        email,
        user,
        memberships,
        roles,
        summary: {
          totalMemberships: memberships.length,
          totalRoles: roles.length,
          activeRoles: roles.filter((r: any) => r.is_active).map((r: any) => r.role),
          hasPendingAny: memberships.some((m: any) => m.status === 'pending'),
          services: membershipSummary,
        },
      });
    } catch (error: any) {
      console.error('DEBUG USER ERROR:', error);
      res.status(500).json({ ...base, error: error.message });
    }
  });

  return router;
}
