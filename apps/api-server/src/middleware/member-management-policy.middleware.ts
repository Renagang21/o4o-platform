import { resolveCanonicalServiceKey } from '@o4o/security-core';
import type { Request, Response, NextFunction } from 'express';
import { extractServiceScope, type ServiceScope } from '../utils/serviceScope.js';
import { AppDataSource } from '../database/connection.js';

/** A stale token must not keep access after its service membership was suspended. */
export async function requireActiveOperatorScope(req: Request, res: Response, next: NextFunction): Promise<void> {
  const scope: ServiceScope = (req as any).serviceScope;
  if (scope.isPlatformAdmin) { next(); return; }
  try {
    const rows = await AppDataSource.query(
      `SELECT service_key FROM service_memberships WHERE user_id = $1 AND status = 'active' AND service_key = ANY($2)`,
      [(req as any).user?.id, scope.serviceKeys],
    );
    const active = new Set(rows.map((row: { service_key: string }) => row.service_key));
    scope.serviceKeys = scope.serviceKeys.filter(key => active.has(key));
    scope.rolePrefixes = scope.rolePrefixes.filter(prefix => active.has(resolveCanonicalServiceKey(prefix)));
    if (!scope.serviceKeys.length) {
      res.status(403).json({ success: false, code: 'SERVICE_MEMBERSHIP_REQUIRED', error: '해당 서비스의 활성 가입이 필요합니다.' });
      return;
    }
    next();
  } catch {
    res.status(503).json({ success: false, code: 'SERVICE_SCOPE_UNAVAILABLE', error: '서비스 권한을 확인하지 못했습니다.' });
  }
}

/** Service member lifecycle authority is independent of ordinary profile editing. */
export function memberManagementPolicy(req: Request, res: Response, next: NextFunction): void {
  const scope: ServiceScope = (req as any).serviceScope;
  const roles: string[] = (req as any).user?.roles ?? [];
  const adminKeys = scope.isPlatformAdmin
    ? scope.serviceKeys
    : extractServiceScope(roles.filter(role => /^[^:]+:admin$/.test(role))).serviceKeys;
  (req as any).memberAdminServiceKeys = adminKeys;
  const role = req.body?.role ?? (req.path.includes('/roles/') ? decodeURIComponent(req.path.split('/roles/')[1]) : undefined);
  const roleService = typeof role === 'string' && role.includes(':') ? resolveCanonicalServiceKey(role.split(':')[0]) : undefined;
  const roleMutation = req.path.endsWith('/roles') || req.path.includes('/roles/');
  // Role ownership determines authority; an unrelated body serviceKey cannot override it.
  // Bare roles are checked again against the resolved catalogue service in the controller.
  const selected = roleMutation && roleService ? roleService : req.body?.membershipServiceKey ?? req.body?.serviceKey ?? req.query.serviceKey;
  const keys = typeof selected === 'string' ? [selected] : scope.serviceKeys;
  const admin = scope.isPlatformAdmin || (keys.length > 0 && keys.every(key => adminKeys.includes(key)));
  (req as any).memberManagementApprovalOnly = !admin;
  const status = req.body?.status;
  const adminAction = req.method === 'DELETE'
    || (req.method === 'POST' && req.path.endsWith('/reactivate'))
    || (req.path.endsWith('/status') || req.path === '/batch-status') && !['approved', 'active', 'rejected'].includes(status)
    || req.method === 'PUT' && req.body?.membershipRole !== undefined
    || req.path.endsWith('/roles');
  if (adminAction && !admin) {
    res.status(403).json({ success: false, code: 'SERVICE_MEMBER_ADMIN_REQUIRED', error: '해당 서비스 관리자 권한이 필요합니다.' });
    return;
  }
  next();
}
