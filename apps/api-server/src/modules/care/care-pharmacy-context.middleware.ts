/**
 * Care Pharmacy Context Middleware
 *
 * WO-GLYCOPHARM-CARE-DATA-ISOLATION-PHASE1-V1
 * WO-GLYCOPHARM-SCOPE-SIMPLIFICATION-V1: error code granularity
 *
 * Resolves the authenticated user's pharmacy and attaches it to the request.
 * All Care/GlycoPharm pharmacy-scoped endpoints use this single middleware.
 *
 * Flow:
 * 1. Requires auth (req.user must exist — use after authenticate middleware)
 * 2. Admin bypass: glycopharm:admin / platform:admin → pharmacyId = null (global access)
 * 3. Looks up organization: created_by_user_id → organization_members fallback
 * 4. Checks glycopharm enrollment
 * 5. Sets req.pharmacyId
 *
 * Error codes (WO-GLYCOPHARM-SCOPE-SIMPLIFICATION-V1):
 *   UNAUTHORIZED              — no user on request
 *   GLYCOPHARM_ORG_NOT_FOUND  — no organization for this user
 *   GLYCOPHARM_ORG_INACTIVE   — organization exists but isActive = false
 *   GLYCOPHARM_NOT_ENROLLED   — organization exists but no active glycopharm enrollment
 *   PHARMACY_LOOKUP_ERROR     — unexpected DB error
 */

import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { roleAssignmentService } from '../auth/services/role-assignment.service.js';

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
      // Admin bypass: global access (pharmacyId = null means no filter)
      // WO-O4O-AUTH-MIDDLEWARE-CONSOLIDATION-V1: JWT snapshot → DB 실시간 조회 전환
      const isAdmin = await roleAssignmentService.hasAnyRole(userId, [...ADMIN_ROLES]);
      if (isAdmin) {
        pcReq.pharmacyId = null;
        next();
        return;
      }

      // Step A: Find organization for this user
      // Priority 1: created_by_user_id (pharmacy owner/creator)
      // Priority 2: organization_members (staff pharmacist, multi-user pharmacies)
      let orgResult = await dataSource.query(
        `SELECT id, "isActive" FROM organizations WHERE created_by_user_id = $1 LIMIT 1`,
        [userId],
      );

      if (orgResult.length === 0) {
        // Fallback: check organization_members
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

      // Step B: Check glycopharm enrollment
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

/** Alias for clarity — identical to createPharmacyContextMiddleware */
export const createGlycopharmOwnerMiddleware = createPharmacyContextMiddleware;
