/**
 * KPA Branch Admin Dashboard Controller
 *
 * WO-KPA-OPERATOR-DASHBOARD-IMPROVEMENT-V1: 분회 운영자용 대시보드 API
 * WO-P1-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 (Phase 1: KPA Migration)
 * - 분회 단위 통계 제공
 * - 소속 분회 범위 내 데이터만 조회
 * - "요약 → 이동" 패턴 지원
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { KpaOrganization } from '../entities/kpa-organization.entity.js';
import { KpaMember } from '../entities/kpa-member.entity.js';
import { KpaApplication } from '../entities/kpa-application.entity.js';
import { KpaBranchNews } from '../entities/kpa-branch-news.entity.js';
import { KpaBranchOfficer } from '../entities/kpa-branch-officer.entity.js';
import { KpaBranchDoc } from '../entities/kpa-branch-doc.entity.js';
import { KpaBranchSettings } from '../entities/kpa-branch-settings.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import { hasAnyServiceRole, hasRoleCompat, logLegacyRoleUsage } from '../../../utils/role.utils.js';

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
 *
 * WO-P4′-MULTI-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 (Phase 4.1: KPA District/Branch)
 * - **KPA 조직 서비스는 오직 KPA role만 신뢰**
 * - Priority 1: KPA prefixed roles ONLY (kpa:branch_admin, kpa:branch_operator, kpa:admin, kpa:operator)
 * - Priority 2: Legacy role detection → Log + DENY
 * - platform:admin 자동 허용 제거 (KPA 조직 격리)
 */
function isBranchOperator(roles: string[] = [], userId: string = 'unknown'): boolean {
  // Priority 1: Check KPA-specific prefixed roles ONLY
  const hasKpaRole = hasAnyServiceRole(roles, [
    'kpa:branch_admin',
    'kpa:branch_operator',
    'kpa:admin',
    'kpa:operator'
  ]);

  if (hasKpaRole) {
    return true;
  }

  // Priority 2: Detect legacy roles and DENY access
  const legacyRoles = ['branch_admin', 'branch_operator', 'admin', 'operator', 'super_admin'];
  const detectedLegacyRoles = roles.filter(r => legacyRoles.includes(r));

  if (detectedLegacyRoles.length > 0) {
    // Log legacy role usage and deny access
    detectedLegacyRoles.forEach(role => {
      logLegacyRoleUsage(userId, role, 'branch-admin-dashboard.controller:isBranchOperator');
    });
    return false; // ❌ DENY - Legacy roles no longer grant access
  }

  // Detect platform/other service roles and deny
  const hasOtherServiceRole = roles.some(r =>
    r.startsWith('platform:') ||
    r.startsWith('neture:') ||
    r.startsWith('glycopharm:') ||
    r.startsWith('cosmetics:') ||
    r.startsWith('glucoseview:')
  );

  if (hasOtherServiceRole) {
    // Platform/other service admins do NOT have KPA organization access
    return false; // ❌ DENY - KPA organization requires kpa:* roles
  }

  return false;
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

        if (!userId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User ID not found' },
          });
          return;
        }

        // Check branch operator permission
        if (!isBranchOperator(userRoles, userId)) {
          res.status(403).json({
            error: { code: 'FORBIDDEN', message: 'Branch operator role required' },
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

        if (!userId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User ID not found' },
          });
          return;
        }

        if (!isBranchOperator(userRoles, userId)) {
          res.status(403).json({
            error: { code: 'FORBIDDEN', message: 'Branch operator role required' },
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
          status: (member.status === 'active' || member.identity_status === 'active') ? 'completed' : 'pending',
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

        if (!userId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User ID not found' },
          });
          return;
        }

        if (!isBranchOperator(userRoles, userId)) {
          res.status(403).json({
            error: { code: 'FORBIDDEN', message: 'Branch operator role required' },
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

  // ──────────────────────────────────────────────────────
  // News CRUD (WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1)
  // ──────────────────────────────────────────────────────

  /** GET /branch-admin/news — list news for branch */
  router.get(
    '/news',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];
        if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }
        if (!isBranchOperator(userRoles, userId)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Branch operator role required' } }); return; }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) { res.json({ success: true, data: [] }); return; }

        const repo = dataSource.getRepository(KpaBranchNews);
        const category = req.query.category as string | undefined;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

        const qb = repo.createQueryBuilder('n')
          .where('n.organization_id = :organizationId', { organizationId })
          .orderBy('n.is_pinned', 'DESC')
          .addOrderBy('n.created_at', 'DESC')
          .skip((page - 1) * limit)
          .take(limit);

        if (category) qb.andWhere('n.category = :category', { category });

        const [items, total] = await qb.getManyAndCount();
        res.json({ success: true, data: { items, total, page, limit } });
      } catch (error: any) {
        console.error('Failed to get branch news:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /** POST /branch-admin/news — create news */
  router.post(
    '/news',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];
        if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }
        if (!isBranchOperator(userRoles, userId)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Branch operator role required' } }); return; }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

        const { title, content, category, is_pinned, is_published } = req.body;
        if (!title) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'title is required' } }); return; }

        const repo = dataSource.getRepository(KpaBranchNews);
        const news = repo.create({
          organization_id: organizationId,
          title,
          content: content || null,
          category: category || 'notice',
          author: authReq.user?.name || null,
          author_id: userId,
          is_pinned: is_pinned ?? false,
          is_published: is_published ?? true,
        });
        const saved = await repo.save(news);
        res.status(201).json({ success: true, data: saved });
      } catch (error: any) {
        console.error('Failed to create branch news:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /** PATCH /branch-admin/news/:id — update news */
  router.patch(
    '/news/:id',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];
        if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }
        if (!isBranchOperator(userRoles, userId)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Branch operator role required' } }); return; }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

        const repo = dataSource.getRepository(KpaBranchNews);
        const existing = await repo.findOne({ where: { id: req.params.id, organization_id: organizationId } });
        if (!existing) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'News not found' } }); return; }

        const { title, content, category, is_pinned, is_published } = req.body;
        if (title !== undefined) existing.title = title;
        if (content !== undefined) existing.content = content;
        if (category !== undefined) existing.category = category;
        if (is_pinned !== undefined) existing.is_pinned = is_pinned;
        if (is_published !== undefined) existing.is_published = is_published;

        const saved = await repo.save(existing);
        res.json({ success: true, data: saved });
      } catch (error: any) {
        console.error('Failed to update branch news:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /** DELETE /branch-admin/news/:id — delete news */
  router.delete(
    '/news/:id',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];
        if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }
        if (!isBranchOperator(userRoles, userId)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Branch operator role required' } }); return; }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

        const repo = dataSource.getRepository(KpaBranchNews);
        const result = await repo.delete({ id: req.params.id, organization_id: organizationId });
        if (result.affected === 0) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'News not found' } }); return; }

        res.json({ success: true, data: { deleted: true } });
      } catch (error: any) {
        console.error('Failed to delete branch news:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ──────────────────────────────────────────────────────
  // Officers CRUD
  // ──────────────────────────────────────────────────────

  /** GET /branch-admin/officers — list officers */
  router.get(
    '/officers',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];
        if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }
        if (!isBranchOperator(userRoles, userId)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Branch operator role required' } }); return; }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) { res.json({ success: true, data: [] }); return; }

        const repo = dataSource.getRepository(KpaBranchOfficer);
        const items = await repo.find({
          where: { organization_id: organizationId },
          order: { sort_order: 'ASC', created_at: 'ASC' },
        });
        res.json({ success: true, data: items });
      } catch (error: any) {
        console.error('Failed to get branch officers:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /** POST /branch-admin/officers — create officer */
  router.post(
    '/officers',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];
        if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }
        if (!isBranchOperator(userRoles, userId)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Branch operator role required' } }); return; }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

        const { name, position, role, pharmacy_name, phone, email, term_start, term_end, is_active, sort_order } = req.body;
        if (!name || !position || !role) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name, position, role are required' } }); return; }

        const repo = dataSource.getRepository(KpaBranchOfficer);
        const officer = repo.create({
          organization_id: organizationId,
          name, position, role,
          pharmacy_name: pharmacy_name || null,
          phone: phone ? phone.replace(/\D/g, '') : null,
          email: email || null,
          term_start: term_start || null,
          term_end: term_end || null,
          is_active: is_active ?? true,
          sort_order: sort_order ?? 0,
        });
        const saved = await repo.save(officer);
        res.status(201).json({ success: true, data: saved });
      } catch (error: any) {
        console.error('Failed to create branch officer:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /** PATCH /branch-admin/officers/:id — update officer */
  router.patch(
    '/officers/:id',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];
        if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }
        if (!isBranchOperator(userRoles, userId)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Branch operator role required' } }); return; }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

        const repo = dataSource.getRepository(KpaBranchOfficer);
        const existing = await repo.findOne({ where: { id: req.params.id, organization_id: organizationId } });
        if (!existing) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Officer not found' } }); return; }

        const fields = ['name', 'position', 'role', 'pharmacy_name', 'phone', 'email', 'term_start', 'term_end', 'is_active', 'sort_order'] as const;
        for (const f of fields) {
          if (req.body[f] !== undefined) (existing as any)[f] = req.body[f];
        }
        // Normalize phone (digits only)
        if (existing.phone) existing.phone = existing.phone.replace(/\D/g, '');

        const saved = await repo.save(existing);
        res.json({ success: true, data: saved });
      } catch (error: any) {
        console.error('Failed to update branch officer:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /** DELETE /branch-admin/officers/:id — delete officer */
  router.delete(
    '/officers/:id',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];
        if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }
        if (!isBranchOperator(userRoles, userId)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Branch operator role required' } }); return; }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

        const repo = dataSource.getRepository(KpaBranchOfficer);
        const result = await repo.delete({ id: req.params.id, organization_id: organizationId });
        if (result.affected === 0) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Officer not found' } }); return; }

        res.json({ success: true, data: { deleted: true } });
      } catch (error: any) {
        console.error('Failed to delete branch officer:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ──────────────────────────────────────────────────────
  // Docs CRUD
  // ──────────────────────────────────────────────────────

  /** GET /branch-admin/docs — list docs */
  router.get(
    '/docs',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];
        if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }
        if (!isBranchOperator(userRoles, userId)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Branch operator role required' } }); return; }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) { res.json({ success: true, data: [] }); return; }

        const repo = dataSource.getRepository(KpaBranchDoc);
        const category = req.query.category as string | undefined;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

        const qb = repo.createQueryBuilder('d')
          .where('d.organization_id = :organizationId', { organizationId })
          .orderBy('d.created_at', 'DESC')
          .skip((page - 1) * limit)
          .take(limit);

        if (category) qb.andWhere('d.category = :category', { category });

        const [items, total] = await qb.getManyAndCount();
        res.json({ success: true, data: { items, total, page, limit } });
      } catch (error: any) {
        console.error('Failed to get branch docs:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /** POST /branch-admin/docs — create doc */
  router.post(
    '/docs',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];
        if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }
        if (!isBranchOperator(userRoles, userId)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Branch operator role required' } }); return; }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

        const { title, description, category, file_url, file_name, file_size, is_public } = req.body;
        if (!title) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'title is required' } }); return; }

        const repo = dataSource.getRepository(KpaBranchDoc);
        const doc = repo.create({
          organization_id: organizationId,
          title,
          description: description || null,
          category: category || 'general',
          file_url: file_url || null,
          file_name: file_name || null,
          file_size: file_size || 0,
          is_public: is_public ?? true,
          uploaded_by: userId,
        });
        const saved = await repo.save(doc);
        res.status(201).json({ success: true, data: saved });
      } catch (error: any) {
        console.error('Failed to create branch doc:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /** PATCH /branch-admin/docs/:id — update doc */
  router.patch(
    '/docs/:id',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];
        if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }
        if (!isBranchOperator(userRoles, userId)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Branch operator role required' } }); return; }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

        const repo = dataSource.getRepository(KpaBranchDoc);
        const existing = await repo.findOne({ where: { id: req.params.id, organization_id: organizationId } });
        if (!existing) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Doc not found' } }); return; }

        const fields = ['title', 'description', 'category', 'file_url', 'file_name', 'file_size', 'is_public'] as const;
        for (const f of fields) {
          if (req.body[f] !== undefined) (existing as any)[f] = req.body[f];
        }

        const saved = await repo.save(existing);
        res.json({ success: true, data: saved });
      } catch (error: any) {
        console.error('Failed to update branch doc:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /** DELETE /branch-admin/docs/:id — delete doc */
  router.delete(
    '/docs/:id',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];
        if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }
        if (!isBranchOperator(userRoles, userId)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Branch operator role required' } }); return; }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

        const repo = dataSource.getRepository(KpaBranchDoc);
        const result = await repo.delete({ id: req.params.id, organization_id: organizationId });
        if (result.affected === 0) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Doc not found' } }); return; }

        res.json({ success: true, data: { deleted: true } });
      } catch (error: any) {
        console.error('Failed to delete branch doc:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  // ──────────────────────────────────────────────────────
  // Settings CRUD
  // ──────────────────────────────────────────────────────

  /** GET /branch-admin/settings — get branch settings */
  router.get(
    '/settings',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];
        if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }
        if (!isBranchOperator(userRoles, userId)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Branch operator role required' } }); return; }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

        const repo = dataSource.getRepository(KpaBranchSettings);
        let settings = await repo.findOne({ where: { organization_id: organizationId } });

        // Auto-create settings row if it doesn't exist
        if (!settings) {
          settings = repo.create({ organization_id: organizationId });
          settings = await repo.save(settings);
        }

        // Also return organization basic info
        const orgRepo = dataSource.getRepository(KpaOrganization);
        const org = await orgRepo.findOne({ where: { id: organizationId } });

        res.json({ success: true, data: { settings, organization: org } });
      } catch (error: any) {
        console.error('Failed to get branch settings:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /** PATCH /branch-admin/settings — update branch settings */
  router.patch(
    '/settings',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];
        if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }
        if (!isBranchOperator(userRoles, userId)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Branch operator role required' } }); return; }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

        const repo = dataSource.getRepository(KpaBranchSettings);
        let settings = await repo.findOne({ where: { organization_id: organizationId } });
        if (!settings) {
          settings = repo.create({ organization_id: organizationId });
        }

        const fields = ['address', 'phone', 'fax', 'email', 'working_hours', 'description',
          'membership_fee_deadline', 'annual_report_deadline', 'fee_settings'] as const;
        for (const f of fields) {
          if (req.body[f] !== undefined) (settings as any)[f] = req.body[f];
        }
        // Normalize phone/fax (digits only)
        if (settings.phone) settings.phone = settings.phone.replace(/\D/g, '');
        if (settings.fax) settings.fax = settings.fax.replace(/\D/g, '');

        const saved = await repo.save(settings);
        res.json({ success: true, data: saved });
      } catch (error: any) {
        console.error('Failed to update branch settings:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  /** PATCH /branch-admin/settings/status — update branch active status */
  router.patch(
    '/settings/status',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];
        if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }
        if (!isBranchOperator(userRoles, userId)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Branch operator role required' } }); return; }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

        const { is_active } = req.body;
        if (typeof is_active !== 'boolean') { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'is_active (boolean) is required' } }); return; }

        const repo = dataSource.getRepository(KpaBranchSettings);
        let settings = await repo.findOne({ where: { organization_id: organizationId } });
        if (!settings) {
          settings = repo.create({ organization_id: organizationId });
        }
        settings.is_active = is_active;
        const saved = await repo.save(settings);

        res.json({ success: true, data: saved });
      } catch (error: any) {
        console.error('Failed to update branch status:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    }
  );

  return router;
}
