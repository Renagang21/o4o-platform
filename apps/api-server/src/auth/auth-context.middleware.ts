/**
 * Auth Context Middleware
 *
 * WO-O4O-AUTH-CONTEXT-UNIFICATION-V1
 *
 * requireStoreAuth: org 필수 (403 if missing)
 * optionalStoreAuth: org 선택적 (없어도 pass)
 *
 * 둘 다 req.authContext + req.organizationId 설정.
 *
 * WO-O4O-STORE-HUB-OPTIONAL-AUTH-MIGRATION-V1:
 *   service-aware guard 도입 — serviceKey 지정 시 해당 서비스 store_owner role 만 인정.
 *   미지정 시 ALL_STORE_OWNER_ROLES fallback (back-compat).
 */

import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import type { AuthContext } from './auth-context.js';
import { isStoreOwner, type StoreOwnerServiceKey } from '../utils/store-owner.utils.js';

/**
 * org 필수 미들웨어. user 없으면 401, org 없으면 403.
 *
 * @param serviceKey  지정 시 해당 서비스의 store_owner role 만 통과. 미지정 시 모든 서비스 허용 (back-compat).
 */
export function requireStoreAuth(dataSource: DataSource, serviceKey?: StoreOwnerServiceKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user?.id) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const { isOwner, organizationId, memberRole } = await isStoreOwner(dataSource, user.id, serviceKey);
    if (!isOwner || !organizationId) {
      res.status(403).json({
        success: false,
        error: 'Store owner access required',
        code: 'STORE_OWNER_REQUIRED',
      });
      return;
    }

    const authContext: AuthContext = {
      userId: user.id,
      organizationId,
      memberRole,
      roles: user.roles || [],
    };

    req.authContext = authContext;
    req.organizationId = organizationId;
    next();
  };
}

/**
 * org 선택적 미들웨어. user/org 없어도 next() 진행.
 *
 * @param serviceKey  지정 시 해당 서비스의 store_owner role 만 organizationId set 대상.
 *                    미지정 시 모든 서비스 허용 (back-compat).
 *                    serviceKey 매칭 실패 시 organizationId 미설정으로 next() — controller 가 graceful 처리.
 */
export function optionalStoreAuth(dataSource: DataSource, serviceKey?: StoreOwnerServiceKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user?.id) {
      next();
      return;
    }

    try {
      const { isOwner, organizationId, memberRole } = await isStoreOwner(dataSource, user.id, serviceKey);
      if (isOwner && organizationId) {
        const authContext: AuthContext = {
          userId: user.id,
          organizationId,
          memberRole,
          roles: user.roles || [],
        };

        req.authContext = authContext;
        req.organizationId = organizationId;
      }
    } catch {
      // Optional — don't block request on failure
    }

    next();
  };
}
