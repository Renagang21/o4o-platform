/**
 * KPA Admin Dashboard Controller
 *
 * WO-KPA-SOCIETY-DASHBOARD-P1-A: Real database queries for admin dashboard
 * WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: requireKpaScope('kpa:admin') 표준화
 * - Uses existing entities only (no new schema)
 * - Returns empty state for unavailable data
 * - Admin only — Operator는 /operator/summary 사용
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationStore } from '../../../modules/store-core/entities/organization-store.entity.js';
import { KpaMember } from '../entities/kpa-member.entity.js';
import { KpaApplication } from '../entities/kpa-application.entity.js';
import logger from '../../../utils/logger.js';

type AuthMiddleware = RequestHandler;
type ScopeMiddleware = (scope: string) => RequestHandler;

// Response interfaces
// WO-O4O-API-STRUCTURE-NORMALIZATION-PHASE2-V1: placeholder 필드 제거
interface DashboardStats {
  totalMembers: number;      // 전체 활성 회원 수
  pendingApprovals: number;  // 승인 대기 신청서
}

interface OrganizationStats {
  total: number;
  byType: {
    association: number;  // 본회
  };
  active: number;
  inactive: number;
}

interface MemberStats {
  total: number;
  byStatus: {
    active: number;
    pending: number;
    suspended: number;
    withdrawn: number;
  };
  byRole: {
    member: number;
    operator: number;
    admin: number;
  };
}

interface ApplicationStats {
  total: number;
  byStatus: {
    submitted: number;
    approved: number;
    rejected: number;
    cancelled: number;
  };
  byType: {
    membership: number;
    service: number;
    other: number;
  };
}

export function createAdminDashboardController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireKpaScope: ScopeMiddleware
): Router {
  const router = Router();

  // WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: Admin scope enforced at router level
  router.use(requireAuth);
  router.use(requireKpaScope('kpa:admin'));

  /**
   * GET /admin/dashboard/stats
   * Get dashboard statistics for admin panel
   */
  router.get(
    '/dashboard/stats',
    async (req: Request, res: Response): Promise<void> => {
      try {
        // Get repositories
        const orgRepo = dataSource.getRepository(OrganizationStore);
        const memberRepo = dataSource.getRepository(KpaMember);
        const appRepo = dataSource.getRepository(KpaApplication);

        // Query member stats
        const totalMembers = await memberRepo.count({ where: { status: 'active' } });

        // Query pending applications
        const pendingApprovals = await appRepo.count({ where: { status: 'submitted' } });

        const stats: DashboardStats = {
          totalMembers,
          pendingApprovals,
        };

        res.json({ success: true, data: stats });
      } catch (error: any) {
        console.error('Failed to get KPA admin dashboard stats:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /admin/dashboard/organizations
   * Get detailed organization statistics
   */
  router.get(
    '/dashboard/organizations',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const orgRepo = dataSource.getRepository(OrganizationStore);

        // WO-O4O-DASHBOARD-QUERY-STABILITY-V1: individual .catch() per query
        const [total, association, active, inactive] = await Promise.all([
          orgRepo.count().catch((e) => { logger.warn('[KpaAdminDashboard] org total failed:', e.message); return 0; }),
          orgRepo.count({ where: { type: 'association' } }).catch((e) => { logger.warn('[KpaAdminDashboard] org association failed:', e.message); return 0; }),
          orgRepo.count({ where: { isActive: true } }).catch((e) => { logger.warn('[KpaAdminDashboard] org active failed:', e.message); return 0; }),
          orgRepo.count({ where: { isActive: false } }).catch((e) => { logger.warn('[KpaAdminDashboard] org inactive failed:', e.message); return 0; }),
        ]);

        const stats: OrganizationStats = {
          total,
          byType: { association },
          active,
          inactive,
        };

        res.json({ success: true, data: stats });
      } catch (error: any) {
        console.error('Failed to get KPA organization stats:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /admin/dashboard/members
   * Get detailed member statistics
   */
  router.get(
    '/dashboard/members',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const memberRepo = dataSource.getRepository(KpaMember);

        // WO-O4O-DASHBOARD-QUERY-STABILITY-V1: individual .catch() per query
        const [
          total,
          active,
          pending,
          suspended,
          withdrawn,
          memberRole,
          operatorRole,
          adminRole,
        ] = await Promise.all([
          memberRepo.count().catch((e) => { logger.warn('[KpaAdminDashboard] member total failed:', e.message); return 0; }),
          memberRepo.count({ where: { status: 'active' } }).catch((e) => { logger.warn('[KpaAdminDashboard] member active failed:', e.message); return 0; }),
          memberRepo.count({ where: { status: 'pending' } }).catch((e) => { logger.warn('[KpaAdminDashboard] member pending failed:', e.message); return 0; }),
          memberRepo.count({ where: { status: 'suspended' } }).catch((e) => { logger.warn('[KpaAdminDashboard] member suspended failed:', e.message); return 0; }),
          memberRepo.count({ where: { status: 'withdrawn' } }).catch((e) => { logger.warn('[KpaAdminDashboard] member withdrawn failed:', e.message); return 0; }),
          memberRepo.count({ where: { role: 'member' } }).catch((e) => { logger.warn('[KpaAdminDashboard] role member failed:', e.message); return 0; }),
          memberRepo.count({ where: { role: 'operator' } }).catch((e) => { logger.warn('[KpaAdminDashboard] role operator failed:', e.message); return 0; }),
          memberRepo.count({ where: { role: 'admin' } }).catch((e) => { logger.warn('[KpaAdminDashboard] role admin failed:', e.message); return 0; }),
        ]);

        const stats: MemberStats = {
          total,
          byStatus: { active, pending, suspended, withdrawn },
          byRole: { member: memberRole, operator: operatorRole, admin: adminRole },
        };

        res.json({ success: true, data: stats });
      } catch (error: any) {
        console.error('Failed to get KPA member stats:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /admin/dashboard/applications
   * Get detailed application statistics
   */
  router.get(
    '/dashboard/applications',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const appRepo = dataSource.getRepository(KpaApplication);

        // WO-O4O-DASHBOARD-QUERY-STABILITY-V1: individual .catch() per query
        const [
          total,
          submitted,
          approved,
          rejected,
          cancelled,
          membership,
          service,
          other,
        ] = await Promise.all([
          appRepo.count().catch((e) => { logger.warn('[KpaAdminDashboard] app total failed:', e.message); return 0; }),
          appRepo.count({ where: { status: 'submitted' } }).catch((e) => { logger.warn('[KpaAdminDashboard] app submitted failed:', e.message); return 0; }),
          appRepo.count({ where: { status: 'approved' } }).catch((e) => { logger.warn('[KpaAdminDashboard] app approved failed:', e.message); return 0; }),
          appRepo.count({ where: { status: 'rejected' } }).catch((e) => { logger.warn('[KpaAdminDashboard] app rejected failed:', e.message); return 0; }),
          appRepo.count({ where: { status: 'cancelled' } }).catch((e) => { logger.warn('[KpaAdminDashboard] app cancelled failed:', e.message); return 0; }),
          appRepo.count({ where: { type: 'membership' } }).catch((e) => { logger.warn('[KpaAdminDashboard] app membership failed:', e.message); return 0; }),
          appRepo.count({ where: { type: 'service' } }).catch((e) => { logger.warn('[KpaAdminDashboard] app service failed:', e.message); return 0; }),
          appRepo.count({ where: { type: 'other' } }).catch((e) => { logger.warn('[KpaAdminDashboard] app other failed:', e.message); return 0; }),
        ]);

        const stats: ApplicationStats = {
          total,
          byStatus: { submitted, approved, rejected, cancelled },
          byType: { membership, service, other },
        };

        res.json({ success: true, data: stats });
      } catch (error: any) {
        console.error('Failed to get KPA application stats:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /admin/pending-applications
   * Get list of pending applications for review
   */
  router.get(
    '/pending-applications',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const limit = parseInt(req.query.limit as string) || 10;
        const appRepo = dataSource.getRepository(KpaApplication);

        const pendingApplications = await appRepo.find({
          where: { status: 'submitted' },
          order: { created_at: 'DESC' },
          take: limit,
          relations: ['organization'],
        });

        res.json({
          success: true,
          data: pendingApplications.map((app) => ({
            id: app.id,
            userId: app.user_id,
            organizationId: app.organization_id,
            organizationName: app.organization?.name || 'Unknown',
            type: app.type,
            status: app.status,
            note: app.note,
            createdAt: app.created_at,
          })),
        });
      } catch (error: any) {
        console.error('Failed to get pending applications:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  return router;
}
