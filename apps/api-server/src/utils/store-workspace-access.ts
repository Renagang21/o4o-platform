import type { DataSource } from 'typeorm';
import type { Request, Response, NextFunction } from 'express';
import { createRequireStoreOwner, type StoreOwnerServiceKey } from './store-owner.utils.js';
import { readPreferredStoreOrganizationId } from './store-organization.resolver.js';
import { resolveApprovedStoreMemberOrganization } from './store-member-access.js';

/** Operational store features. Membership management must keep the owner-only guard. */
export function createRequireStoreWorkspaceAccess(dataSource: DataSource, serviceKey?: StoreOwnerServiceKey) {
  const ownerOnly = createRequireStoreOwner(dataSource, serviceKey);
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) return await ownerOnly(req, res, next);
      const preferred = readPreferredStoreOrganizationId(req);
      const organizationId = await resolveApprovedStoreMemberOrganization(dataSource, req.user.id, serviceKey, preferred);
      if (!organizationId) return await ownerOnly(req, res, (error?: unknown) => {
        if (error) return next(error);
        if (preferred && req.organizationId !== preferred) {
          res.status(403).json({ success: false, code: 'STORE_ACCESS_REQUIRED', error: '선택한 매장에 접근할 수 없습니다.' });
          return;
        }
        next();
      });
      req.organizationId = organizationId;
      req.authContext = { userId: req.user.id, organizationId, memberRole: 'staff', roles: req.user.roles ?? [] };
      next();
    } catch (error) { next(error); }
  };
}
