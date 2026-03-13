/**
 * Service Users Audit Endpoint
 *
 * GET /__debug__/service-users?service=glycopharm
 *
 * 제약:
 * - 인증 불필요
 * - SELECT만 실행 (UPDATE/DELETE 절대 금지)
 * - 운영 중 안전하게 호출 가능
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';

export function createServiceUsersAuditRouter(dataSource: DataSource): Router {
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

    const service = (req.query.service as string) || '';
    if (!service) {
      res.status(400).json({ ...base, error: 'service query parameter required (e.g. ?service=glycopharm)' });
      return;
    }

    try {
      const users = await dataSource.query(`
        SELECT
          u.id,
          u.email,
          u."firstName",
          u."lastName",
          u.name,
          u.nickname,
          u.phone,
          u.status,
          u."isActive",
          u."isEmailVerified",
          u.domain,
          u.service_key,
          u."createdAt",
          u."lastLoginAt",
          ARRAY_AGG(DISTINCT ra.role ORDER BY ra.role) FILTER (WHERE ra.is_active = true) AS active_roles
        FROM users u
        INNER JOIN role_assignments ra ON ra.user_id = u.id AND ra.is_active = true
        WHERE ra.role LIKE $1
        GROUP BY u.id
        ORDER BY u."createdAt" DESC
      `, [`${service}:%`]);

      const domainUsers = await dataSource.query(`
        SELECT
          u.id,
          u.email,
          u."firstName",
          u."lastName",
          u.name,
          u.nickname,
          u.phone,
          u.status,
          u."isActive",
          u."isEmailVerified",
          u.domain,
          u.service_key,
          u."createdAt",
          u."lastLoginAt",
          COALESCE(
            ARRAY_AGG(DISTINCT ra.role ORDER BY ra.role) FILTER (WHERE ra.is_active = true),
            ARRAY[]::text[]
          ) AS active_roles
        FROM users u
        LEFT JOIN role_assignments ra ON ra.user_id = u.id AND ra.is_active = true
        WHERE (u.domain = $1 OR u.service_key = $1)
          AND u.id NOT IN (
            SELECT DISTINCT ra2.user_id FROM role_assignments ra2
            WHERE ra2.role LIKE $2 AND ra2.is_active = true
          )
        GROUP BY u.id
        ORDER BY u."createdAt" DESC
      `, [service, `${service}:%`]);

      res.json({
        ...base,
        service,
        summary: {
          byRole: users.length,
          byDomainOnly: domainUsers.length,
          total: users.length + domainUsers.length,
        },
        usersByRole: users,
        usersByDomainOnly: domainUsers,
      });
    } catch (error: any) {
      res.status(500).json({ ...base, error: error.message });
    }
  });

  return router;
}
