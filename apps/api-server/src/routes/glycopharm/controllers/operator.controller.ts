/**
 * Glycopharm Operator Dashboard Controller
 *
 * WO-GLYCOPHARM-DASHBOARD-P1-A: Real database queries for operator dashboard
 * WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1:
 *   Phase 1 — Router-level scope guard
 *   Phase 4 — 5-block OperatorDashboardConfig response
 *
 * - Platform-wide statistics for operators/admins
 * - Uses existing entities only (no new schema)
 * - Returns 5-block format matching @o4o/operator-ux-core
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { GlycopharmApplication } from '../entities/glycopharm-application.entity.js';
// GlycopharmOrder - REMOVED (Phase 4-A: Legacy Order System Deprecation)
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
import { CmsContent } from '@o4o-apps/cms-core';
// WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1: Centralized scope middleware
import { requireGlycopharmScope } from '../../../middleware/glycopharm-scope.middleware.js';
import { CopilotEngineService } from '../../../copilot/copilot-engine.service.js';
import type { KpiItem, AiSummaryItem, ActionItem, ActivityItem, QuickActionItem, OperatorDashboardConfig } from '../../../types/operator-dashboard.types.js';

type AuthMiddleware = RequestHandler;

export function createOperatorController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();
  const copilotEngine = new CopilotEngineService();

  // WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1: Router-level guard
  // Replaces per-handler isOperatorOrAdmin() inline check
  router.use(requireAuth);
  router.use(requireGlycopharmScope('glycopharm:operator') as any);

  /**
   * GET /operator/dashboard
   * Glycopharm operator dashboard — 5-block response
   */
  router.get(
    '/dashboard',
    async (req: Request, res: Response): Promise<void> => {
      try {
        // Get repositories
        const applicationRepo = dataSource.getRepository(GlycopharmApplication);
        const productRepo = dataSource.getRepository(GlycopharmProduct);
        const contentRepo = dataSource.getRepository(CmsContent);
        const serviceKey = 'glycopharm';

        // === Parallel data fetch ===
        const [
          pharmacyCounts,
          pendingApprovals,
          totalProducts,
          activeProducts,
          draftProducts,
          cmsTotal,
          cmsPublished,
          recentApplications,
        ] = await Promise.all([
          // Organizations enrolled in glycopharm
          dataSource.query(`
            SELECT o."isActive" AS is_active, COUNT(*)::int AS cnt
            FROM organizations o
            JOIN organization_service_enrollments ose
              ON ose.organization_id = o.id AND ose.service_code = 'glycopharm'
            GROUP BY o."isActive"
          `) as Promise<Array<{ is_active: boolean; cnt: number }>>,
          applicationRepo.count({ where: { status: 'submitted' } }),
          productRepo.count(),
          productRepo.count({ where: { status: 'active' } }),
          productRepo.count({ where: { status: 'draft' } }),
          contentRepo.count({ where: { serviceKey } }),
          contentRepo.count({ where: { serviceKey, status: 'published' } }),
          // Recent applications for activity log
          applicationRepo.find({
            where: { status: 'submitted' },
            order: { submittedAt: 'DESC' },
            take: 5,
          }),
        ]);

        const activePharmacies = pharmacyCounts.find(r => r.is_active === true)?.cnt || 0;
        const inactivePharmacies = pharmacyCounts.find(r => r.is_active === false)?.cnt || 0;

        // === Build 5-block response ===

        // Block 1: KPIs
        const kpis: KpiItem[] = [
          { key: 'active-pharmacies', label: '활성 약국', value: activePharmacies, status: 'neutral' },
          { key: 'inactive-pharmacies', label: '비활성 약국', value: inactivePharmacies, status: inactivePharmacies > 0 ? 'warning' : 'neutral' },
          { key: 'active-products', label: '판매 상품', value: activeProducts, status: 'neutral' },
          { key: 'total-products', label: '전체 상품', value: totalProducts, status: 'neutral' },
          { key: 'cms-published', label: '게시 콘텐츠', value: cmsPublished, status: 'neutral' },
        ];

        // Block 2: AI Summary (Copilot Engine)
        const copilotMetrics = {
          pharmacies: { active: activePharmacies, inactive: inactivePharmacies },
          applications: { pending: pendingApprovals },
          products: { active: activeProducts, draft: draftProducts, total: totalProducts },
        };
        const copilotUser = {
          id: (req as any).user?.id || '',
          role: 'glycopharm:operator',
        };
        const { insights: aiSummary } = await copilotEngine.generateInsights(
          'glycopharm', copilotMetrics, copilotUser,
        );

        // Block 3: Action Queue
        const actionQueue: ActionItem[] = [
          { id: 'pending-apps', label: '입점 신청 대기', count: pendingApprovals, link: '/operator/applications' },
          { id: 'draft-products', label: '임시저장 상품', count: draftProducts, link: '/operator/products?status=draft' },
        ];

        // Block 4: Activity Log (from recent applications)
        const activityLog: ActivityItem[] = recentApplications.map((app, i) => ({
          id: `app-${i}`,
          message: `${app.organizationName} — 입점 신청 (${app.organizationType})`,
          timestamp: app.submittedAt?.toISOString?.() || new Date().toISOString(),
        }));

        // Block 5: Quick Actions
        const quickActions: QuickActionItem[] = [
          { id: 'manage-pharmacies', label: '약국 관리', link: '/operator/pharmacies', icon: 'store' },
          { id: 'manage-products', label: '상품 관리', link: '/operator/products', icon: 'package' },
          { id: 'manage-applications', label: '입점 심사', link: '/operator/applications', icon: 'clipboard' },
          { id: 'manage-content', label: '콘텐츠 관리', link: '/operator/content', icon: 'file-text' },
        ];

        const response: OperatorDashboardConfig = {
          kpis,
          aiSummary,
          actionQueue,
          activityLog,
          quickActions,
        };

        res.json({ success: true, data: response });
      } catch (error: any) {
        console.error('Failed to get operator dashboard:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /operator/recent-orders
   * Get recent orders for operator dashboard
   *
   * NOTE: Phase 4-A - Legacy Order System Deprecated
   * Returns empty array until E-commerce Core integration is complete.
   */
  router.get(
    '/recent-orders',
    async (req: Request, res: Response): Promise<void> => {
      try {
        // Phase 4-A: Legacy Order System removed
        // Return empty array until E-commerce Core integration
        res.json({
          success: true,
          data: [],
          _notice: 'Order system migration in progress. Orders will be available via E-commerce Core.',
        });
      } catch (error: any) {
        console.error('Failed to get recent orders:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /operator/pending-applications
   * Get pending applications for operator review
   */
  router.get(
    '/pending-applications',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const limit = parseInt(req.query.limit as string) || 10;
        const applicationRepo = dataSource.getRepository(GlycopharmApplication);

        // Only 'submitted' applications are pending (no 'supplementing' status exists)
        const pendingApplications = await applicationRepo.find({
          where: { status: 'submitted' },
          order: { submittedAt: 'DESC' },
          take: limit,
        });

        res.json({
          success: true,
          data: pendingApplications.map((app) => ({
            id: app.id,
            organizationName: app.organizationName,
            organizationType: app.organizationType,
            status: app.status,
            serviceTypes: app.serviceTypes,
            submittedAt: app.submittedAt,
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
