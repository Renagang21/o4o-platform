import { CENTRAL_OPERATION_SERVICES, type CentralOperationService } from '@o4o/types';
import { centralApiMenus } from './central-operation-menu.middleware.js';
import { assertCentralOperationRequest } from '../services/admin/central-operation-menu-grants.js';
import { OperationError } from '../services/operations/operation-audit.js';
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
    const permitted: string[] = [];
    for (const key of scope.serviceKeys) {
      try {
        if ((CENTRAL_OPERATION_SERVICES as readonly string[]).includes(key)) {
          const menus = key === 'neture' ? centralApiMenus('neture',req) : [`${key}.members`, ...(key === 'community' && req.method === 'GET' ? ['community.erase-members'] : [])];
          await assertCentralOperationRequest(AppDataSource,(req as any).user.id,key as CentralOperationService,menus, (req as any).authMethod);
        }
        permitted.push(key);
      } catch (error) { if (!(error instanceof OperationError && error.status === 403)) throw error; }
    }
    scope.serviceKeys = permitted;
    scope.rolePrefixes = scope.rolePrefixes.filter(prefix => permitted.includes(resolveCanonicalServiceKey(prefix)));
    if (!permitted.length) { res.status(403).json({success:false,code:'CENTRAL_MENU_NOT_DELEGATED',error:'회원 관리 업무를 위임받지 않았습니다.'}); return; }
    next();
  } catch {
    res.status(503).json({ success: false, code: 'SERVICE_SCOPE_UNAVAILABLE', error: '서비스 권한을 확인하지 못했습니다.' });
  }
}

function selectManagementService(req: Request, roleMutation: boolean, roleService?: string): unknown {
  if (roleMutation && roleService) return roleService;
  const membershipRoleEdit = req.method === 'PUT' && typeof req.body?.membershipRole === 'string' && req.body.membershipRole.trim();
  if (membershipRoleEdit) return req.body?.membershipServiceKey ?? req.body?.serviceKey ?? req.query.serviceKey;
  return req.body?.serviceKey ?? req.query.serviceKey;
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
  const selected = selectManagementService(req, roleMutation, roleService);
  const keys = typeof selected === 'string' ? [selected.trim()] : scope.serviceKeys;
  const admin = scope.isPlatformAdmin || (keys.length > 0 && keys.every(key => adminKeys.includes(key)));
  const ownsSelection = scope.isPlatformAdmin || (keys.length > 0 && keys.every(key => scope.serviceKeys.includes(key)));
  if (!ownsSelection) {
    res.status(403).json({ success: false, code: 'SERVICE_SCOPE_REQUIRED', error: '담당 서비스의 회원만 관리할 수 있습니다.' });
    return;
  }
  (req as any).memberManagementApprovalOnly = false;
  const status = req.body?.status;
  // Ordinary role removal is daily work; membership deletion remains sensitive.
  const adminAction = req.method === 'DELETE' && !roleMutation
    || (req.path.endsWith('/status') || req.path === '/batch-status')
      && !['approved', 'active', 'rejected', 'suspended'].includes(status);
  if (adminAction && !admin) {
    res.status(403).json({ success: false, code: 'SERVICE_MEMBER_ADMIN_REQUIRED', error: '해당 서비스 관리자 권한이 필요합니다.' });
    return;
  }
  if (req.method === 'DELETE' && !roleMutation && keys.includes('community')) {
    res.status(409).json({ success: false, code: 'COMMUNITY_DELETION_ROUTE_REQUIRED', error: '커뮤니티 관리자 화면에서 활동 데이터와 연결 범위를 확인한 뒤 삭제해 주세요.' });
    return;
  }
  next();
}
