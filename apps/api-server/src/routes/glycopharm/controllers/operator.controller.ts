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
import { computeOperatorAlerts } from '../../../utils/operator-alert.utils.js';
import type { ActionLogService } from '@o4o/action-log-core';

type AuthMiddleware = RequestHandler;

export function createOperatorController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  actionLogService?: ActionLogService
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
          totalPatients,
          highRiskPatients,
          openCareAlerts,
          recentCareAlerts,
          careEnabledResult,
          weeklyCareActivityResult,
          recentOperatorActions,
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
          // 9. Total patients (Care)
          dataSource.query(`
            SELECT COUNT(*)::int AS cnt FROM patient_health_profiles
          `) as Promise<Array<{ cnt: number }>>,
          // 10. High risk patients (Care)
          dataSource.query(`
            SELECT COUNT(DISTINCT patient_id)::int AS cnt
            FROM care_kpi_snapshots WHERE risk_level = 'high'
          `) as Promise<Array<{ cnt: number }>>,
          // 11. Open care alerts count (Care Action Queue)
          dataSource.query(`
            SELECT COUNT(*)::int AS cnt FROM care_alerts WHERE status = 'open'
          `) as Promise<Array<{ cnt: number }>>,
          // 12. Recent care alerts (Care Activity Log)
          dataSource.query(`
            SELECT alert_type, severity, message, created_at
            FROM care_alerts
            ORDER BY created_at DESC
            LIMIT 3
          `) as Promise<Array<{ alert_type: string; severity: string; message: string; created_at: string }>>,
          // 13. Care enabled pharmacies (distinct pharmacies with care data)
          dataSource.query(`
            SELECT COUNT(DISTINCT pharmacy_id)::int AS cnt FROM care_kpi_snapshots
          `) as Promise<Array<{ cnt: number }>>,
          // 14. Weekly care activity (coaching sessions last 7 days)
          dataSource.query(`
            SELECT COUNT(*)::int AS cnt FROM care_coaching_sessions
            WHERE created_at > NOW() - INTERVAL '7 days'
          `) as Promise<Array<{ cnt: number }>>,
          // 15. Recent operator actions (from action_logs)
          dataSource.query(`
            SELECT action_key, meta, created_at
            FROM action_logs
            WHERE service_key = 'glycopharm' AND source = 'manual'
            ORDER BY created_at DESC
            LIMIT 3
          `) as Promise<Array<{ action_key: string; meta: any; created_at: string }>>,
        ]);

        const activePharmacies = pharmacyCounts.find(r => r.is_active === true)?.cnt || 0;
        const inactivePharmacies = pharmacyCounts.find(r => r.is_active === false)?.cnt || 0;
        const totalPatientsCount = totalPatients[0]?.cnt || 0;
        const highRiskCount = highRiskPatients[0]?.cnt || 0;
        const openAlertsCount = openCareAlerts[0]?.cnt || 0;
        const careEnabledPharmacies = careEnabledResult[0]?.cnt || 0;
        const weeklyCareActivityCount = weeklyCareActivityResult[0]?.cnt || 0;
        const totalPharmacies = pharmacyCounts.reduce((sum, r) => sum + r.cnt, 0);
        const careAdoptionRate = totalPharmacies > 0 ? Math.round((careEnabledPharmacies / totalPharmacies) * 100) : 0;

        // === Build 5-block response ===

        // Block 1: KPIs (8개 — Network / Commerce / Care)
        const kpis: KpiItem[] = [
          { key: 'active-pharmacies', label: '활성 약국', value: activePharmacies, status: 'neutral' },
          { key: 'pending-applications', label: '입점 대기', value: pendingApprovals, status: pendingApprovals > 0 ? 'warning' : 'neutral' },
          { key: 'active-products', label: '판매 상품', value: activeProducts, status: 'neutral' },
          { key: 'total-orders', label: '총 주문', value: 0, status: 'neutral' }, // STUB: E-commerce Core 미통합
          { key: 'total-patients', label: '등록 환자', value: totalPatientsCount, status: 'neutral' },
          { key: 'high-risk-patients', label: '고위험 환자', value: highRiskCount, status: highRiskCount > 0 ? 'warning' : 'neutral' },
          { key: 'care-adoption-rate', label: 'Care 도입률', value: `${careAdoptionRate}%`, status: careAdoptionRate < 30 ? 'warning' : 'neutral' },
          { key: 'open-care-alerts', label: '미처리 알림', value: openAlertsCount, status: openAlertsCount > 0 ? 'warning' : 'neutral' },
        ];

        // Block 2: AI Summary (Copilot Engine)
        const copilotMetrics = {
          pharmacies: { active: activePharmacies, inactive: inactivePharmacies },
          applications: { pending: pendingApprovals },
          products: { active: activeProducts, draft: draftProducts, total: totalProducts },
          care: { patients: totalPatientsCount, highRisk: highRiskCount, openAlerts: openAlertsCount, adoptionRate: careAdoptionRate, weeklyActivity: weeklyCareActivityCount },
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
          { id: 'care-alerts', label: '케어 알림 미확인', count: openAlertsCount, link: '/operator/care/alerts' },
        ];

        // Block 4: Activity Log (applications + care alerts + operator actions, sorted by time)
        const activityLog: ActivityItem[] = [
          ...recentApplications.map((app, i) => ({
            id: `app-${i}`,
            message: `${app.organizationName} — 입점 신청 (${app.organizationType})`,
            timestamp: app.submittedAt?.toISOString?.() || new Date().toISOString(),
          })),
          ...recentCareAlerts.map((alert, i) => ({
            id: `care-${i}`,
            message: `[${alert.severity}] ${alert.message}`,
            timestamp: alert.created_at || new Date().toISOString(),
          })),
          ...recentOperatorActions.map((action, i) => ({
            id: `audit-${i}`,
            message: `[운영] ${action.action_key.replace('glycopharm.', '')}`,
            timestamp: action.created_at || new Date().toISOString(),
          })),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

        // Block 5: Quick Actions
        const quickActions: QuickActionItem[] = [
          { id: 'manage-pharmacies', label: '약국 관리', link: '/operator/pharmacies', icon: 'store' },
          { id: 'manage-products', label: '상품 관리', link: '/operator/products', icon: 'package' },
          { id: 'manage-applications', label: '입점 심사', link: '/operator/applications', icon: 'clipboard' },
          { id: 'manage-care', label: '케어 관리', link: '/operator/care', icon: 'heart' },
          { id: 'manage-content', label: '콘텐츠 관리', link: '/operator/content', icon: 'file-text' },
        ];

        // Block 6: Operator Alerts (rule-based, computed at request time)
        const operatorAlerts = computeOperatorAlerts({
          openCareAlerts: openAlertsCount,
          careAdoptionRate,
          highRiskPatients: highRiskCount,
          weeklyCareActivity: weeklyCareActivityCount,
          pendingApplications: pendingApprovals,
          draftProducts: draftProducts,
        });

        const response: OperatorDashboardConfig = {
          kpis,
          aiSummary,
          operatorAlerts,
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
