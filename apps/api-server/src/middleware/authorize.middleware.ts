/**
 * ⚠️ DEPRECATED - DO NOT USE
 *
 * This file is deprecated and will be removed in Phase 4 of auth refactoring.
 * Use `middleware/auth.middleware.ts` instead.
 *
 * Status: DEAD CODE (0 routes using this)
 * Replacement: auth.middleware.ts::requireRole, requireAdmin
 * Removal Date: TBD (Phase 4)
 *
 * @deprecated Since 2025-11-19
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth.js';

export const authorize = (allowedRoles: string[]) => {
  console.warn('[DEPRECATED] authorize.middleware.ts is deprecated. Use auth.middleware.ts::requireRole instead.');

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userRole = user.role || (user as any).userRole;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};
