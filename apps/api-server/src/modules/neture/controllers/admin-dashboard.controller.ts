/**
 * Neture Admin Dashboard Controller
 *
 * WO-O4O-ADMIN-OPERATOR-DASHBOARD-SEPARATION-V1
 *
 * GET /api/v1/neture/admin/dashboard
 *   → Admin 전용 4-block AdminDashboardConfig 응답
 *   → Block A: Structure Snapshot (구조 지표)
 *   → Block B: Policy Overview (승인 현황)
 *   → Block C: Governance Alerts (AI 기반 경고)
 *   → Block D: Structure Actions (구조 변경 진입점)
 *
 * Auth: requireAuth + requireNetureScope('neture:admin')
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import { CopilotEngineService } from '../../../copilot/copilot-engine.service.js';
import logger from '../../../utils/logger.js';

type AuthenticatedRequest = Request & {
  user?: { id: string; role: string };
};

export function createAdminDashboardController(dataSource: DataSource): Router {
  const router = Router();
  const copilotEngine = new CopilotEngineService();

  router.use(requireAuth);
  router.use(requireNetureScope('neture:admin') as any);

  /**
   * GET /admin/dashboard
   * Admin 전용 4-block 대시보드
   */
  router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id || '';

      // === 9 parallel queries ===
      const [
        totalUsersRow,
        activeSuppliersRow,
        pendingApprovalsRow,
        activePartnersRow,
        activeProductsRow,
        pendingSettlementsRow,
        pendingSuppliersRow,
        pendingRegsRow,
        partnerRequestsRow,
      ] = await Promise.all([
        // 1. 총 사용자
        dataSource.query(`SELECT COUNT(*)::int AS cnt FROM users`),
        // 2. 활성 공급사
        dataSource.query(`SELECT COUNT(*)::int AS cnt FROM neture_suppliers WHERE status = 'ACTIVE'`),
        // 3. 상품 승인 대기
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt FROM offer_service_approvals
           WHERE service_key = 'neture' AND approval_status = 'pending'`,
        ),
        // 4. 활성 파트너
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt FROM neture.neture_partners WHERE status = 'active'`,
        ).catch(() => [{ cnt: 0 }]),
        // 5. 활성 상품
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt FROM supplier_product_offers
           WHERE is_active = true AND approval_status = 'APPROVED'`,
        ),
        // 6. 정산 대기
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt FROM neture_settlements WHERE status = 'pending'`,
        ).catch(() => [{ cnt: 0 }]),
        // 7. 공급사 승인 대기
        dataSource.query(`SELECT COUNT(*)::int AS cnt FROM neture_suppliers WHERE status = 'PENDING'`),
        // 8. 가입 승인 대기
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt FROM service_memberships
           WHERE service_key = 'neture' AND status = 'pending'`,
        ),
        // 9. 파트너 요청
        dataSource.query(
          `SELECT COUNT(*)::int AS cnt FROM neture_partnership_requests WHERE status = 'OPEN'`,
        ),
      ]);

      const totalUsers = totalUsersRow[0]?.cnt || 0;
      const activeSuppliers = activeSuppliersRow[0]?.cnt || 0;
      const pendingApprovals = pendingApprovalsRow[0]?.cnt || 0;
      const activePartners = activePartnersRow[0]?.cnt || 0;
      const activeProducts = activeProductsRow[0]?.cnt || 0;
      const pendingSettlements = pendingSettlementsRow[0]?.cnt || 0;
      const pendingSuppliers = pendingSuppliersRow[0]?.cnt || 0;
      const pendingRegs = pendingRegsRow[0]?.cnt || 0;
      const partnerRequests = partnerRequestsRow[0]?.cnt || 0;

      // === Block A: Structure Snapshot ===
      const structureMetrics = [
        { key: 'total-users', label: '총 사용자', value: totalUsers, status: 'stable' as const },
        { key: 'active-suppliers', label: '활성 공급사', value: activeSuppliers, status: 'stable' as const },
        {
          key: 'pending-approvals',
          label: '승인 대기',
          value: pendingApprovals,
          status: (pendingApprovals > 0 ? 'attention' : 'stable') as 'stable' | 'attention',
        },
        { key: 'active-partners', label: '활성 파트너', value: activePartners, status: 'stable' as const },
        { key: 'active-products', label: '활성 상품', value: activeProducts, status: 'stable' as const },
        {
          key: 'pending-settlements',
          label: '정산 대기',
          value: pendingSettlements,
          status: (pendingSettlements > 0 ? 'attention' : 'stable') as 'stable' | 'attention',
        },
      ];

      // === Block B: Policy Overview ===
      // WO-NETURE-OSA-PHASEA-DECISION-PRESSURE-REMOVE-V1: 'pending-products' (OSA 승인 대기) 항목 제거
      const policies = [
        {
          key: 'pending-suppliers',
          label: '공급사 승인 대기',
          status: (pendingSuppliers > 0 ? 'partial' : 'configured') as 'partial' | 'configured',
          link: '/admin/admin-suppliers',
        },
        {
          key: 'pending-regs',
          label: '가입 승인 대기',
          status: (pendingRegs > 0 ? 'partial' : 'configured') as 'partial' | 'configured',
          link: '/admin/applications',
        },
        {
          key: 'partner-requests',
          label: '파트너 요청',
          status: (partnerRequests > 0 ? 'partial' : 'configured') as 'partial' | 'configured',
          link: '/admin/applications',
        },
      ];

      // === Block C: Governance Alerts (AI) ===
      const adminMetrics = {
        users: { total: totalUsers },
        suppliers: { active: activeSuppliers, pending: pendingSuppliers },
        products: { active: activeProducts, pendingApprovals },
        registrations: { pending: pendingRegs },
        partners: { active: activePartners, requests: partnerRequests },
        settlements: { pending: pendingSettlements },
      };
      const { insights } = await copilotEngine.generateInsights(
        'neture',
        adminMetrics,
        { id: userId, role: 'neture:admin' },
      );
      const governanceAlerts = insights.map((i) => ({
        id: i.id,
        message: i.message,
        level: i.level as 'info' | 'warning' | 'critical',
        link: i.link?.replace(/^\/operator/, '/admin'),
      }));

      // === Block D: Structure Actions ===
      const structureActions = [
        { id: 'manage-users', label: '사용자 관리', link: '/admin/users', icon: 'users' },
        { id: 'manage-operators', label: '운영자 관리', link: '/admin/operators', icon: 'shield' },
        { id: 'manage-suppliers', label: '공급사 승인', link: '/admin/admin-suppliers', icon: 'store' },
        { id: 'manage-settlements', label: '정산 관리', link: '/admin/settlements', icon: 'dollar-sign' },
        { id: 'manage-commissions', label: '커미션 관리', link: '/admin/commissions', icon: 'percent' },
        { id: 'manage-roles', label: '역할 관리', link: '/admin/roles', icon: 'key' },
      ];

      res.json({
        success: true,
        data: { structureMetrics, policies, governanceAlerts, structureActions },
      });
    } catch (error: any) {
      logger.error('[Neture Admin Dashboard] Error:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: error.message,
      });
    }
  });

  return router;
}
