/**
 * Care Pharmacy Context Middleware
 *
 * WO-GLYCOPHARM-CARE-DATA-ISOLATION-PHASE1-V1
 *
 * Resolves the authenticated user's pharmacy and attaches it to the request.
 * All Care endpoints require pharmacy-level data isolation.
 *
 * Flow:
 * 1. Requires auth (req.user must exist — use after authenticate middleware)
 * 2. Looks up glycopharm_pharmacies where created_by_user_id = userId
 * 3. Admin bypass: glycopharm:admin / platform:admin → pharmacyId = null (global access)
 * 4. If pharmacy found → req.pharmacyId set
 * 5. If not found → 403
 */

import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { hasAnyServiceRole } from '../../utils/role.utils.js';

export interface PharmacyContextRequest extends Request {
  user?: any;
  pharmacyId?: string | null;
}

const ADMIN_ROLES = [
  'glycopharm:admin',
  'platform:admin',
  'platform:super_admin',
] as const;

export function createPharmacyContextMiddleware(dataSource: DataSource) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const pcReq = req as PharmacyContextRequest;
    const user = pcReq.user;

    if (!user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const userId = user.id;
    const userRoles: string[] = user.roles || [];

    // Admin bypass: global access (pharmacyId = null means no filter)
    if (hasAnyServiceRole(userRoles, [...ADMIN_ROLES] as any)) {
      pcReq.pharmacyId = null;
      next();
      return;
    }

    // Look up pharmacy for this user
    try {
      const result = await dataSource.query(
        `SELECT id FROM glycopharm_pharmacies WHERE created_by_user_id = $1 AND status = 'active' LIMIT 1`,
        [userId]
      );

      if (!result || result.length === 0) {
        res.status(403).json({
          error: {
            code: 'NO_PHARMACY',
            message: 'No active pharmacy found for this user. Care access requires pharmacy registration.',
          },
        });
        return;
      }

      pcReq.pharmacyId = result[0].id;
      next();
    } catch (error) {
      res.status(500).json({
        error: { code: 'PHARMACY_LOOKUP_ERROR', message: 'Failed to resolve pharmacy context' },
      });
    }
  };
}
