/**
 * Yaksa Routes
 *
 * Phase A-1: Yaksa API Implementation
 * Main entry point for Yaksa API routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { createYaksaController } from './controllers/yaksa.controller.js';
import { requireAuth as coreRequireAuth } from '../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../types/auth.js';

/**
 * Yaksa access verification middleware
 *
 * WO-O4O-LEGACY-BACKEND-JWT-SCOPE-BRANCH-REMOVAL-V1:
 *   기존 `user.scopes` 기반 두 분기(`requiredScope`, `'yaksa:admin'`)를 제거했다.
 *   `yaksa:*` 는 SERVICE_SCOPES 에 정의된 적이 없어 발급되지 않았고, 인증 미들웨어가
 *   scopes 를 req.user 로 전달하지도 않아 항상 false 로만 평가되던 축이다.
 *   실제로 통과시켜 온 조건은 `platform:super_admin` role 뿐이므로 동작은 불변이다.
 *   (`/api/v1/yaksa/*` route 자체의 존폐는 별도 WO 로 판단한다.)
 */
function requireYaksaScope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    // WO-NETURE-GUARD-REALIGNMENT-V1: Legacy unprefixed roles removed
    if (authReq.user?.roles?.includes('platform:super_admin')) {
      return next();
    }

    return res.status(403).json({
      error: {
        code: 'YAKSA_403',
        message: `Permission denied. Required scope: ${requiredScope}`,
      },
    });
  };
}

/**
 * Create Yaksa routes
 */
export function createYaksaRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Create controller with auth middleware
  const yaksaController = createYaksaController(
    dataSource,
    coreRequireAuth as any,
    requireYaksaScope
  );

  // Mount controller
  router.use('/', yaksaController);

  return router;
}

export default createYaksaRoutes;
