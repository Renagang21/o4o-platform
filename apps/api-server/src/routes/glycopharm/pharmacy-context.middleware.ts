/**
 * Pharmacy Context Middleware
 *
 * WO-GLYCOPHARM-CARE-DATA-ISOLATION-PHASE1-V1
 * WO-GLYCOPHARM-SCOPE-SIMPLIFICATION-V1: error code granularity
 * Moved from modules/care/ — WO-O4O-GLYCOPHARM-CARE-REMOVAL-V1
 *
 * Resolves the authenticated user's pharmacy and attaches it to the request.
 * All GlycoPharm pharmacy-scoped endpoints use this single middleware.
 */

import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';

export interface PharmacyContextRequest extends Request {
  user?: any;
  pharmacyId?: string | null;
}

const ADMIN_ROLES = [
  'glycopharm:admin',
  'glycopharm:operator',
  'platform:admin',
  'platform:super_admin',
] as const;

export function createPharmacyContextMiddleware(dataSource: DataSource) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const pcReq = req as PharmacyContextRequest;
    const user = pcReq.user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const userId = user.id;

    try {
      const isAdmin = await roleAssignmentService.hasAnyRole(userId, [...ADMIN_ROLES]);
      if (isAdmin) {
        pcReq.pharmacyId = null;
        next();
        return;
      }

      let orgResult = await dataSource.query(
        `SELECT id, "isActive" FROM organizations WHERE created_by_user_id = $1 LIMIT 1`,
        [userId],
      );

      if (orgResult.length === 0) {
        orgResult = await dataSource.query(
          `SELECT o.id, o."isActive"
           FROM organizations o
           JOIN organization_members om ON om.organization_id = o.id
           WHERE om.user_id = $1 AND om.left_at IS NULL
           ORDER BY om.is_primary DESC
           LIMIT 1`,
          [userId],
        );
      }

      if (orgResult.length === 0) {
        res.status(403).json({
          success: false,
          error: { code: 'GLYCOPHARM_ORG_NOT_FOUND', message: 'No organization found for this user.' },
        });
        return;
      }

      const org = orgResult[0];

      if (!org.isActive) {
        res.status(403).json({
          success: false,
          error: { code: 'GLYCOPHARM_ORG_INACTIVE', message: 'Organization is inactive.' },
        });
        return;
      }

      const enrollmentResult = await dataSource.query(
        `SELECT id FROM organization_service_enrollments
         WHERE organization_id = $1 AND service_code = 'glycopharm' AND status = 'active'
         LIMIT 1`,
        [org.id],
      );

      if (enrollmentResult.length === 0) {
        res.status(403).json({
          success: false,
          error: { code: 'GLYCOPHARM_NOT_ENROLLED', message: 'No active glycopharm enrollment found.' },
        });
        return;
      }

      pcReq.pharmacyId = org.id;
      next();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[PharmacyContext] lookup error for userId:', userId, errMsg);
      res.status(500).json({
        success: false,
        error: { code: 'PHARMACY_LOOKUP_ERROR', message: 'Failed to resolve pharmacy context' },
      });
    }
  };
}

export const createGlycopharmOwnerMiddleware = createPharmacyContextMiddleware;
