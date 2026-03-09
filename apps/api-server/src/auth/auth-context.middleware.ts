/**
 * Auth Context Middleware
 *
 * WO-O4O-AUTH-CONTEXT-UNIFICATION-V1
 *
 * requireStoreAuth: org 필수 (403 if missing)
 * optionalStoreAuth: org 선택적 (없어도 pass)
 *
 * 둘 다 req.authContext + req.organizationId 설정.
 */

import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import type { AuthContext } from './auth-context.js';
import { isStoreOwner } from '../utils/store-owner.utils.js';

/**
 * org 필수 미들웨어. user 없으면 401, org 없으면 403.
 */
export function requireStoreAuth(dataSource: DataSource) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user?.id) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const { isOwner, organizationId, memberRole } = await isStoreOwner(dataSource, user.id);
    if (!isOwner || !organizationId) {
      res.status(403).json({
        success: false,
        error: { code: 'STORE_OWNER_REQUIRED', message: 'Store owner access required' },
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
 */
export function optionalStoreAuth(dataSource: DataSource) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user?.id) {
      next();
      return;
    }

    try {
      const { isOwner, organizationId, memberRole } = await isStoreOwner(dataSource, user.id);
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
