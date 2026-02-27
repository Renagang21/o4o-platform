/**
 * RBAC Backfill User Role Controller
 *
 * WO-RBAC-DATA-NORMALIZATION-EXECUTION-V1
 *
 * GET  /__debug__/rbac-backfill-user-role          — dry-run (count only)
 * POST /__debug__/rbac-backfill-user-role/execute   — assign 'user' role to RA-less active users
 *
 * Security: X-Admin-Secret header required for POST
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';

function verifyAdminSecret(req: Request, res: Response): boolean {
  const secret = req.headers['x-admin-secret'] as string;
  const jwtSecret = process.env.JWT_SECRET;

  if (secret && jwtSecret && secret === jwtSecret) {
    return true;
  }

  res.status(401).json({ success: false, error: 'Invalid admin secret', code: 'ADMIN_SECRET_REQUIRED' });
  return false;
}

export function createRbacBackfillUserRoleRouter(dataSource: DataSource): Router {
  const router = Router();

  // GET / — dry-run: show RA-less active users
  router.get('/', async (_req: Request, res: Response): Promise<void> => {
    try {
      const orphanedUsers = await dataSource.query(`
        SELECT u.id, u.email, u."createdAt"
        FROM users u
        WHERE u."isActive" = true
        AND NOT EXISTS (
          SELECT 1 FROM role_assignments ra
          WHERE ra.user_id = u.id
          AND ra.is_active = true
        )
        ORDER BY u."createdAt"
      `);

      res.json({
        timestamp: new Date().toISOString(),
        purpose: 'WO-RBAC-DATA-NORMALIZATION-EXECUTION-V1',
        mode: 'DRY_RUN',
        count: orphanedUsers.length,
        users: orphanedUsers,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message, code: 'QUERY_FAILED' });
    }
  });

  // POST /execute — assign 'user' role to RA-less active users
  router.post('/execute', async (req: Request, res: Response): Promise<void> => {
    if (!verifyAdminSecret(req, res)) return;

    try {
      const result = await dataSource.query(`
        INSERT INTO role_assignments (
          user_id, role, is_active,
          valid_from, assigned_at,
          scope_type
        )
        SELECT
          u.id,
          'user',
          true,
          NOW(),
          NOW(),
          'global'
        FROM users u
        WHERE u."isActive" = true
        AND NOT EXISTS (
          SELECT 1 FROM role_assignments ra
          WHERE ra.user_id = u.id
          AND ra.is_active = true
        )
        ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO NOTHING
      `);

      res.json({
        timestamp: new Date().toISOString(),
        purpose: 'WO-RBAC-DATA-NORMALIZATION-EXECUTION-V1',
        mode: 'EXECUTED',
        affectedRows: result?.[1] ?? 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message, code: 'EXECUTION_FAILED' });
    }
  });

  return router;
}
