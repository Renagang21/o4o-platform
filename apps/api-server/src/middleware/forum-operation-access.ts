import { assertCentralOperationRequest } from '../services/admin/central-operation-menu-grants.js';
import { centralApiMenus } from './central-operation-menu.middleware.js';
import type { RequestHandler } from 'express';
import { AppDataSource } from '../database/connection.js';
import { getServiceMembershipStatusFromDb } from '../utils/service-membership.js';
import { isServiceAdmin, isServiceOperator } from '../utils/role.utils.js';
import type { ServiceKey } from '../types/roles.js';
const services: Record<string, ServiceKey> = { neture: 'neture', 'kpa-society': 'kpa', 'k-cosmetics': 'cosmetics' };

/** An action tier never replaces the service's current membership boundary. */
export const forumOperationAccess = (tier: 'operator' | 'admin'): RequestHandler => async (req, res, next) => {
  const service = (req as any)._serviceCode as string;
  const roles: string[] = (req as any).user?.roles ?? [];
  const permitted = services[service] && (tier === 'admin' ? isServiceAdmin(roles, services[service]) : isServiceOperator(roles, services[service]));
  if (!permitted) { res.status(403).json({ success: false, code: 'SERVICE_ACTION_FORBIDDEN', error: '이 조치에 필요한 서비스 권한이 없습니다.' }); return; }
  if (roles.includes('platform:super_admin')) { next(); return; }
  try {
    const status = await getServiceMembershipStatusFromDb(AppDataSource, (req as any).user.id, service);
    if (status !== 'active') { res.status(403).json({ success: false, code: 'MEMBERSHIP_NOT_ACTIVE', error: '현재 서비스의 활성 가입이 필요합니다.' }); return; }
    if (service === 'neture') await assertCentralOperationRequest(AppDataSource, (req as any).user.id, 'neture', centralApiMenus('neture', req), (req as any).authMethod);
    next();
  } catch { res.status(503).json({ success: false, error: '현재 서비스 권한을 확인하지 못했습니다.' }); }
};
