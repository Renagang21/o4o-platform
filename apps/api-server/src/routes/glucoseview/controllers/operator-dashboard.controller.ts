/**
 * GlucoseView Operator Dashboard Controller
 *
 * WO-O4O-OPERATOR-DASHBOARD-DATA-NORMALIZATION-V1 (Phase 3)
 *
 * GET /api/v1/glucoseview/operator/dashboard
 *   → Returns 5-block OperatorDashboardConfig for GlucoseView operators
 *
 * Auth: requireAuth + requireGlucoseViewScope('glucoseview:operator')
 * Data sources:
 *   - glucoseview_pharmacies (status counts)
 *   - glucoseview_pharmacists (approval counts)
 *   - glucoseview_customers (total count)
 *   - glucoseview_vendors (active count)
 *   - glucoseview_applications (pending, recent)
 *   - cms_contents (serviceKey='glucoseview')
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireGlucoseViewScope } from '../../../middleware/glucoseview-scope.middleware.js';
import { CopilotEngineService } from '../../../copilot/copilot-engine.service.js';
import type { KpiItem, AiSummaryItem, ActionItem, ActivityItem, QuickActionItem, OperatorDashboardConfig } from '../../../types/operator-dashboard.types.js';
import { computeOperatorAlerts } from '../../../utils/operator-alert.utils.js';
import type { ActionLogService } from '@o4o/action-log-core';

export function createOperatorDashboardController(
  dataSource: DataSource,
  actionLogService?: ActionLogService
): Router {
  const router = Router();
  const copilotEngine = new CopilotEngineService();

  router.use(requireAuth);
  router.use(requireGlucoseViewScope('glucoseview:operator') as any);

  /**
   * GET /operator/dashboard
   * GlucoseView operator dashboard — 5-block response
   */
  router.get('/dashboard', async (_req: Request, res: Response): Promise<void> => {
    try {
      // === Parallel data fetch ===
      const [
        pharmacyCounts,
        pharmacistCounts,
        customerCount,
        vendorCount,
        pendingApplications,
        cmsPublished,
        recentApplications,
        highRiskPatients,
        openCareAlerts,
        recentCareAlerts,
        careEnabledResult,
        weeklyCareActivityResult,
        recentOperatorActions,
      ] = await Promise.all([
        // 1. Pharmacies by status
        dataSource.query(`
          SELECT status, COUNT(*)::int AS cnt
          FROM glucoseview_pharmacies
          GROUP BY status
        `) as Promise<Array<{ status: string; cnt: number }>>,

        // 2. Pharmacists by approval_status
        dataSource.query(`
          SELECT approval_status, COUNT(*)::int AS cnt
          FROM glucoseview_pharmacists
          GROUP BY approval_status
        `) as Promise<Array<{ approval_status: string; cnt: number }>>,

        // 3. Total customers
        dataSource.query(`
          SELECT COUNT(*)::int AS cnt FROM glucoseview_customers
        `) as Promise<Array<{ cnt: number }>>,

        // 4. Active vendors
        dataSource.query(`
          SELECT COUNT(*)::int AS cnt FROM glucoseview_vendors WHERE status = 'active'
        `) as Promise<Array<{ cnt: number }>>,

        // 5. Pending applications
        dataSource.query(`
          SELECT COUNT(*)::int AS cnt FROM glucoseview_applications WHERE status = 'submitted'
        `) as Promise<Array<{ cnt: number }>>,

        // 6. Published CMS content
        dataSource.query(`
          SELECT COUNT(*)::int AS cnt FROM cms_contents WHERE "serviceKey" = 'glucoseview' AND status = 'published'
        `) as Promise<Array<{ cnt: number }>>,

        // 7. Recent applications (activity log)
        dataSource.query(`
          SELECT pharmacy_name, status, submitted_at
          FROM glucoseview_applications
          ORDER BY submitted_at DESC
          LIMIT 5
        `) as Promise<Array<{ pharmacy_name: string; status: string; submitted_at: string }>>,

        // 8. High risk patients (Care)
        dataSource.query(`
          SELECT COUNT(DISTINCT patient_id)::int AS cnt
          FROM care_kpi_snapshots WHERE risk_level = 'high'
        `) as Promise<Array<{ cnt: number }>>,

        // 9. Open care alerts count (Care Action Queue)
        dataSource.query(`
          SELECT COUNT(*)::int AS cnt FROM care_alerts WHERE status = 'open'
        `) as Promise<Array<{ cnt: number }>>,

        // 10. Recent care alerts (Care Activity Log)
        dataSource.query(`
          SELECT alert_type, severity, message, created_at
          FROM care_alerts
          ORDER BY created_at DESC
          LIMIT 3
        `) as Promise<Array<{ alert_type: string; severity: string; message: string; created_at: string }>>,
        // 11. Care enabled pharmacies (distinct pharmacies with care data)
        dataSource.query(`
          SELECT COUNT(DISTINCT pharmacy_id)::int AS cnt FROM care_kpi_snapshots
        `) as Promise<Array<{ cnt: number }>>,
        // 12. Weekly care activity (coaching sessions last 7 days)
        dataSource.query(`
          SELECT COUNT(*)::int AS cnt FROM care_coaching_sessions
          WHERE created_at > NOW() - INTERVAL '7 days'
        `) as Promise<Array<{ cnt: number }>>,
        // 13. Recent operator actions (from action_logs)
        dataSource.query(`
          SELECT action_key, meta, created_at
          FROM action_logs
          WHERE service_key = 'glucoseview' AND source = 'manual'
          ORDER BY created_at DESC
          LIMIT 3
        `) as Promise<Array<{ action_key: string; meta: any; created_at: string }>>,
      ]);

      const activePharmacies = pharmacyCounts.find(r => r.status === 'active')?.cnt || 0;
      const approvedPharmacists = pharmacistCounts.find(r => r.approval_status === 'approved')?.cnt || 0;
      const pendingPharmacists = pharmacistCounts.find(r => r.approval_status === 'pending')?.cnt || 0;
      const totalCustomers = customerCount[0]?.cnt || 0;
      const activeVendors = vendorCount[0]?.cnt || 0;
      const pendingApps = pendingApplications[0]?.cnt || 0;
      const publishedContent = cmsPublished[0]?.cnt || 0;
      const highRiskCount = highRiskPatients[0]?.cnt || 0;
      const openAlertsCount = openCareAlerts[0]?.cnt || 0;
      const careEnabledPharmacies = careEnabledResult[0]?.cnt || 0;
      const weeklyCareActivityCount = weeklyCareActivityResult[0]?.cnt || 0;
      const totalPharmacies = pharmacyCounts.reduce((sum, r) => sum + r.cnt, 0);
      const careAdoptionRate = totalPharmacies > 0 ? Math.round((careEnabledPharmacies / totalPharmacies) * 100) : 0;

      // === Build 5-block response ===

      // Block 1: KPIs (8개 — Network / Care / Commerce)
      const kpis: KpiItem[] = [
        { key: 'active-pharmacies', label: '활성 약국', value: activePharmacies, status: 'neutral' },
        { key: 'approved-pharmacists', label: '승인 약사', value: approvedPharmacists, status: 'neutral' },
        { key: 'total-customers', label: '등록 고객', value: totalCustomers, status: 'neutral' },
        { key: 'high-risk-patients', label: '고위험 환자', value: highRiskCount, status: highRiskCount > 0 ? 'warning' : 'neutral' },
        { key: 'active-vendors', label: '활성 벤더', value: activeVendors, status: 'neutral' },
        { key: 'pending-applications', label: '신청 대기', value: pendingApps, status: pendingApps > 0 ? 'warning' : 'neutral' },
        { key: 'care-adoption-rate', label: 'Care 도입률', value: `${careAdoptionRate}%`, status: careAdoptionRate < 30 ? 'warning' : 'neutral' },
        { key: 'weekly-care-activity', label: '주간 Care 활동', value: weeklyCareActivityCount, status: 'neutral' },
      ];

      // Block 2: AI Summary (Copilot Engine)
      const inactivePharmacies = pharmacyCounts.find(r => r.status === 'inactive')?.cnt || 0;
      const copilotMetrics = {
        pharmacies: { active: activePharmacies, inactive: inactivePharmacies },
        pharmacists: { approved: approvedPharmacists, pending: pendingPharmacists },
        customers: { total: totalCustomers },
        vendors: { active: activeVendors },
        applications: { pending: pendingApps },
        care: { highRisk: highRiskCount, openAlerts: openAlertsCount, adoptionRate: careAdoptionRate, weeklyActivity: weeklyCareActivityCount },
      };
      const copilotUser = {
        id: (_req as any).user?.id || '',
        role: 'glucoseview:operator',
      };
      const { insights: aiSummary } = await copilotEngine.generateInsights(
        'glucoseview', copilotMetrics, copilotUser,
      );

      // Block 3: Action Queue
      const actionQueue: ActionItem[] = [
        { id: 'pending-applications', label: '신청 승인 대기', count: pendingApps, link: '/operator/applications' },
        { id: 'pending-pharmacists', label: '약사 승인 대기', count: pendingPharmacists, link: '/operator/users' },
        { id: 'care-alerts', label: '케어 알림 미확인', count: openAlertsCount, link: '/operator/care/alerts' },
      ];

      // Block 4: Activity Log (applications + care alerts + operator actions, sorted by time)
      const activityLog: ActivityItem[] = [
        ...recentApplications.map((app, i) => ({
          id: `app-${i}`,
          message: `${app.pharmacy_name} — 참여 신청 (${app.status === 'submitted' ? '대기' : app.status === 'approved' ? '승인' : '반려'})`,
          timestamp: app.submitted_at || new Date().toISOString(),
        })),
        ...recentCareAlerts.map((alert, i) => ({
          id: `care-${i}`,
          message: `[${alert.severity}] ${alert.message}`,
          timestamp: alert.created_at || new Date().toISOString(),
        })),
        ...recentOperatorActions.map((action, i) => ({
          id: `audit-${i}`,
          message: `[운영] ${action.action_key.replace('glucoseview.', '')}`,
          timestamp: action.created_at || new Date().toISOString(),
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

      // Block 5: Quick Actions
      const quickActions: QuickActionItem[] = [
        { id: 'manage-applications', label: '신청 관리', link: '/operator/applications', icon: 'clipboard' },
        { id: 'manage-users', label: '회원 관리', link: '/operator/users', icon: 'users' },
        { id: 'manage-products', label: '상품 관리', link: '/operator/products', icon: 'package' },
        { id: 'manage-stores', label: '매장 관리', link: '/operator/stores', icon: 'store' },
        { id: 'manage-care', label: '케어 관리', link: '/operator/care', icon: 'heart' },
        { id: 'ai-report', label: 'AI 리포트', link: '/operator/ai-report', icon: 'bar-chart' },
      ];

      // Block 6: Operator Alerts (rule-based, computed at request time)
      const operatorAlerts = computeOperatorAlerts({
        openCareAlerts: openAlertsCount,
        careAdoptionRate,
        highRiskPatients: highRiskCount,
        weeklyCareActivity: weeklyCareActivityCount,
        pendingApplications: pendingApps,
        pendingApprovals: pendingPharmacists,
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
      console.error('[GlucoseView Operator Dashboard] Error:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
