/**
 * KPA Branch Admin Dashboard Controller
 *
 * WO-KPA-OPERATOR-DASHBOARD-IMPROVEMENT-V1: 분회 운영자용 대시보드 API
 * - 분회 단위 통계 제공
 * - 소속 분회 범위 내 데이터만 조회
 * - "요약 → 이동" 패턴 지원
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { KpaOrganization } from '../entities/kpa-organization.entity.js';
import { KpaMember } from '../entities/kpa-member.entity.js';
import { KpaApplication } from '../entities/kpa-application.entity.js';
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = RequestHandler;

// Response interfaces
interface BranchDashboardStats {
  totalMembers: number;       // 분회 소속 전체 회원
  activeMembers: number;      // 활성 회원
  pendingAnnualReports: number; // 신상신고서 대기 (Entity 없음 - 0)
  pendingMembershipFees: number; // 연회비 미납 (Entity 없음 - 0)
  recentPosts: number;        // 최근 게시물 (Entity 없음 - 0)
  upcomingEvents: number;     // 예정 행사 (Entity 없음 - 0)
}

interface RecentActivity {
  id: string;
  type: 'annual_report' | 'membership_fee' | 'member_join' | 'post';
  title: string;
  date: string;
  status: 'pending' | 'completed' | 'rejected';
}

/**
 * Check if user has branch admin/operator role
 */
function isBranchOperator(roles: string[] = []): boolean {
  return (
    roles.includes('admin') ||
    roles.includes('operator') ||
    roles.includes('branch_admin') ||
    roles.includes('branch_operator') ||
    roles.includes('super_admin')
  );
}

/**
 * Get user's organization ID from membership
 */
async function getUserOrganizationId(
  dataSource: DataSource,
  userId: string
): Promise<string | null> {
  const memberRepo = dataSource.getRepository(KpaMember);
  const member = await memberRepo.findOne({
    where: { user_id: userId },
  });
  return member?.organization_id || null;
}

export function createBranchAdminDashboardController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();

  /**
   * GET /branch-admin/dashboard/stats
   * Get dashboard statistics for branch admin panel
   * Returns stats scoped to the user's organization
   */
  router.get(
    '/dashboard/stats',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        // Check branch operator permission
        if (!isBranchOperator(userRoles)) {
          res.status(403).json({
            error: { code: 'FORBIDDEN', message: 'Branch operator role required' },
          });
          return;
        }

        if (!userId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User ID not found' },
          });
          return;
        }

        // Get user's organization
        const organizationId = await getUserOrganizationId(dataSource, userId);

        if (!organizationId) {
          // User not associated with any organization - return empty stats
          res.json({
            success: true,
            data: {
              totalMembers: 0,
              activeMembers: 0,
              pendingAnnualReports: 0,
              pendingMembershipFees: 0,
              recentPosts: 0,
              upcomingEvents: 0,
            } as BranchDashboardStats,
          });
          return;
        }

        // Get repositories
        const memberRepo = dataSource.getRepository(KpaMember);

        // Query member stats for this organization
        const [totalMembers, activeMembers] = await Promise.all([
          memberRepo.count({ where: { organization_id: organizationId } }),
          memberRepo.count({ where: { organization_id: organizationId, status: 'active' } }),
        ]);

        // No annual report, membership fee, post, or event entities yet - return 0
        const stats: BranchDashboardStats = {
          totalMembers,
          activeMembers,
          pendingAnnualReports: 0,
          pendingMembershipFees: 0,
          recentPosts: 0,
          upcomingEvents: 0,
        };

        res.json({ success: true, data: stats });
      } catch (error: any) {
        console.error('Failed to get KPA branch admin dashboard stats:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /branch-admin/dashboard/activities
   * Get recent activities for the branch
   */
  router.get(
    '/dashboard/activities',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!isBranchOperator(userRoles)) {
          res.status(403).json({
            error: { code: 'FORBIDDEN', message: 'Branch operator role required' },
          });
          return;
        }

        if (!userId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User ID not found' },
          });
          return;
        }

        // Get user's organization
        const organizationId = await getUserOrganizationId(dataSource, userId);

        if (!organizationId) {
          res.json({ success: true, data: [] });
          return;
        }

        const limit = parseInt(req.query.limit as string) || 10;

        // Get recent member joins as activities
        const memberRepo = dataSource.getRepository(KpaMember);
        const recentMembers = await memberRepo.find({
          where: { organization_id: organizationId },
          order: { created_at: 'DESC' },
          take: limit,
        });

        const activities: RecentActivity[] = recentMembers.map((member) => ({
          id: member.id,
          type: 'member_join' as const,
          title: `${member.pharmacy_name || member.license_number || '신규 회원'} - 가입`,
          date: member.created_at?.toISOString() || new Date().toISOString(),
          status: member.status === 'active' ? 'completed' : 'pending',
        }));

        res.json({ success: true, data: activities });
      } catch (error: any) {
        console.error('Failed to get KPA branch activities:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /branch-admin/dashboard/members
   * Get member list summary for the branch
   */
  router.get(
    '/dashboard/members',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!isBranchOperator(userRoles)) {
          res.status(403).json({
            error: { code: 'FORBIDDEN', message: 'Branch operator role required' },
          });
          return;
        }

        if (!userId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User ID not found' },
          });
          return;
        }

        const organizationId = await getUserOrganizationId(dataSource, userId);

        if (!organizationId) {
          res.json({
            success: true,
            data: {
              total: 0,
              byStatus: { active: 0, pending: 0, suspended: 0 },
              byRole: { member: 0, operator: 0, admin: 0 },
            },
          });
          return;
        }

        const memberRepo = dataSource.getRepository(KpaMember);

        const [
          total,
          active,
          pending,
          suspended,
          memberRole,
          operatorRole,
          adminRole,
        ] = await Promise.all([
          memberRepo.count({ where: { organization_id: organizationId } }),
          memberRepo.count({ where: { organization_id: organizationId, status: 'active' } }),
          memberRepo.count({ where: { organization_id: organizationId, status: 'pending' } }),
          memberRepo.count({ where: { organization_id: organizationId, status: 'suspended' } }),
          memberRepo.count({ where: { organization_id: organizationId, role: 'member' } }),
          memberRepo.count({ where: { organization_id: organizationId, role: 'operator' } }),
          memberRepo.count({ where: { organization_id: organizationId, role: 'admin' } }),
        ]);

        res.json({
          success: true,
          data: {
            total,
            byStatus: { active, pending, suspended },
            byRole: { member: memberRole, operator: operatorRole, admin: adminRole },
          },
        });
      } catch (error: any) {
        console.error('Failed to get KPA branch member stats:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  return router;
}
