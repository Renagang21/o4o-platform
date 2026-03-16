/**
 * GlucoseView Operator Dashboard Service
 *
 * WO-O4O-OPERATOR-CODE-CLEANUP-AND-REFRACTOR-V1
 *
 * Data fetching and 5-block response assembly for GlucoseView operator dashboard.
 * Extracted from operator-dashboard.controller.ts to reduce controller complexity.
 */

import type { DataSource } from 'typeorm';
import type { CopilotEngineService } from '../../../copilot/copilot-engine.service.js';
import type { KpiItem, ActionItem, ActivityItem, QuickActionItem, OperatorDashboardConfig } from '../../../types/operator-dashboard.types.js';
import { computeOperatorAlerts } from '../../../utils/operator-alert.utils.js';
import {
  fetchCareMetrics,
  fetchRecentAuditActions,
  buildCareActivityItems,
  buildAuditActivityItems,
  mergeActivityLog,
} from '../../../utils/operator-dashboard-queries.js';

export async function buildGlucoseViewDashboardConfig(
  dataSource: DataSource,
  copilotEngine: CopilotEngineService,
  userId: string
): Promise<OperatorDashboardConfig> {
  // === Parallel data fetch (service-specific + shared care/audit) ===
  const [
    pharmacyCounts,
    pharmacistCounts,
    customerCount,
    vendorCount,
    pendingApplications,
    recentApplications,
    care,
    recentAuditActions,
  ] = await Promise.all([
    dataSource.query(`
      SELECT status, COUNT(*)::int AS cnt
      FROM glucoseview_pharmacies
      GROUP BY status
    `) as Promise<Array<{ status: string; cnt: number }>>,
    dataSource.query(`
      SELECT approval_status, COUNT(*)::int AS cnt
      FROM glucoseview_pharmacists
      GROUP BY approval_status
    `) as Promise<Array<{ approval_status: string; cnt: number }>>,
    dataSource.query(`
      SELECT COUNT(*)::int AS cnt FROM glucoseview_customers
    `) as Promise<Array<{ cnt: number }>>,
    dataSource.query(`
      SELECT COUNT(*)::int AS cnt FROM glucoseview_vendors WHERE status = 'active'
    `) as Promise<Array<{ cnt: number }>>,
    dataSource.query(`
      SELECT COUNT(*)::int AS cnt FROM glucoseview_applications WHERE status = 'submitted'
    `) as Promise<Array<{ cnt: number }>>,
    dataSource.query(`
      SELECT pharmacy_name, status, submitted_at
      FROM glucoseview_applications
      ORDER BY submitted_at DESC
      LIMIT 5
    `) as Promise<Array<{ pharmacy_name: string; status: string; submitted_at: string }>>,
    fetchCareMetrics(dataSource, 'glucoseview'),
    fetchRecentAuditActions(dataSource, 'glucoseview'),
  ]);

  const activePharmacies = pharmacyCounts.find(r => r.status === 'active')?.cnt || 0;
  const approvedPharmacists = pharmacistCounts.find(r => r.approval_status === 'approved')?.cnt || 0;
  const pendingPharmacists = pharmacistCounts.find(r => r.approval_status === 'pending')?.cnt || 0;
  const totalCustomers = customerCount[0]?.cnt || 0;
  const activeVendors = vendorCount[0]?.cnt || 0;
  const pendingApps = pendingApplications[0]?.cnt || 0;
  const totalPharmacies = pharmacyCounts.reduce((sum, r) => sum + r.cnt, 0);
  const careAdoptionRate = totalPharmacies > 0
    ? Math.round((care.careEnabledPharmacies / totalPharmacies) * 100) : 0;

  // Block 1: KPIs (8개 — Network / Care / Commerce)
  const kpis: KpiItem[] = [
    { key: 'active-pharmacies', label: '활성 약국', value: activePharmacies, status: 'neutral' },
    { key: 'approved-pharmacists', label: '승인 약사', value: approvedPharmacists, status: 'neutral' },
    { key: 'total-customers', label: '등록 고객', value: totalCustomers, status: 'neutral' },
    { key: 'high-risk-patients', label: '고위험 환자', value: care.highRiskPatients, status: care.highRiskPatients > 0 ? 'warning' : 'neutral' },
    { key: 'active-vendors', label: '활성 벤더', value: activeVendors, status: 'neutral' },
    { key: 'pending-applications', label: '신청 대기', value: pendingApps, status: pendingApps > 0 ? 'warning' : 'neutral' },
    { key: 'care-adoption-rate', label: 'Care 도입률', value: `${careAdoptionRate}%`, status: careAdoptionRate < 30 ? 'warning' : 'neutral' },
    { key: 'weekly-care-activity', label: '주간 Care 활동', value: care.weeklyCareActivity, status: 'neutral' },
  ];

  // Block 2: AI Summary (Copilot Engine)
  const inactivePharmacies = pharmacyCounts.find(r => r.status === 'inactive')?.cnt || 0;
  const copilotMetrics = {
    pharmacies: { active: activePharmacies, inactive: inactivePharmacies },
    pharmacists: { approved: approvedPharmacists, pending: pendingPharmacists },
    customers: { total: totalCustomers },
    vendors: { active: activeVendors },
    applications: { pending: pendingApps },
    care: {
      highRisk: care.highRiskPatients,
      openAlerts: care.openCareAlerts,
      adoptionRate: careAdoptionRate,
      weeklyActivity: care.weeklyCareActivity,
    },
  };
  const { insights: aiSummary } = await copilotEngine.generateInsights(
    'glucoseview', copilotMetrics, { id: userId, role: 'glucoseview:operator' },
  );

  // Block 3: Action Queue
  const actionQueue: ActionItem[] = [
    { id: 'pending-applications', label: '신청 승인 대기', count: pendingApps, link: '/operator/applications' },
    { id: 'pending-pharmacists', label: '약사 승인 대기', count: pendingPharmacists, link: '/operator/users' },
    { id: 'care-alerts', label: '케어 알림 미확인', count: care.openCareAlerts, link: '/operator/care/alerts' },
  ];

  // Block 4: Activity Log
  const applicationItems: ActivityItem[] = recentApplications.map((app, i) => ({
    id: `app-${i}`,
    message: `${app.pharmacy_name} — 참여 신청 (${app.status === 'submitted' ? '대기' : app.status === 'approved' ? '승인' : '반려'})`,
    timestamp: app.submitted_at || new Date().toISOString(),
  }));
  const activityLog = mergeActivityLog(
    applicationItems,
    buildCareActivityItems(care.recentCareAlerts),
    buildAuditActivityItems(recentAuditActions, 'glucoseview'),
  );

  // Block 5: Quick Actions
  const quickActions: QuickActionItem[] = [
    { id: 'manage-applications', label: '신청 관리', link: '/operator/applications', icon: 'clipboard' },
    { id: 'manage-users', label: '회원 관리', link: '/operator/users', icon: 'users' },
    { id: 'manage-products', label: '상품 관리', link: '/operator/products', icon: 'package' },
    { id: 'manage-stores', label: '매장 관리', link: '/operator/stores', icon: 'store' },
    { id: 'manage-care', label: '케어 관리', link: '/operator/care', icon: 'heart' },
    { id: 'ai-report', label: 'AI 리포트', link: '/operator/ai-report', icon: 'bar-chart' },
  ];

  // Block 6: Operator Alerts
  const operatorAlerts = computeOperatorAlerts({
    openCareAlerts: care.openCareAlerts,
    careAdoptionRate,
    highRiskPatients: care.highRiskPatients,
    weeklyCareActivity: care.weeklyCareActivity,
    pendingApplications: pendingApps,
    pendingApprovals: pendingPharmacists,
  });

  return { kpis, aiSummary, operatorAlerts, actionQueue, activityLog, quickActions };
}
