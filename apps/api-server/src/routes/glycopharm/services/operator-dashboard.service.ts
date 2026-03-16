/**
 * GlycoPharm Operator Dashboard Service
 *
 * WO-O4O-OPERATOR-CODE-CLEANUP-AND-REFRACTOR-V1
 *
 * Data fetching and 5-block response assembly for GlycoPharm operator dashboard.
 * Extracted from operator.controller.ts to reduce controller complexity.
 */

import type { DataSource } from 'typeorm';
import { GlycopharmApplication } from '../entities/glycopharm-application.entity.js';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
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

export async function buildGlycoPharmDashboardConfig(
  dataSource: DataSource,
  copilotEngine: CopilotEngineService,
  userId: string
): Promise<OperatorDashboardConfig> {
  const applicationRepo = dataSource.getRepository(GlycopharmApplication);
  const productRepo = dataSource.getRepository(GlycopharmProduct);

  // === Parallel data fetch (service-specific + shared care/audit) ===
  const [
    pharmacyCounts,
    pendingApprovals,
    totalProducts,
    activeProducts,
    draftProducts,
    recentApplications,
    totalPatients,
    care,
    recentAuditActions,
  ] = await Promise.all([
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
    applicationRepo.find({
      where: { status: 'submitted' },
      order: { submittedAt: 'DESC' },
      take: 5,
    }),
    dataSource.query(`
      SELECT COUNT(*)::int AS cnt FROM patient_health_profiles
    `) as Promise<Array<{ cnt: number }>>,
    fetchCareMetrics(dataSource, 'glycopharm'),
    fetchRecentAuditActions(dataSource, 'glycopharm'),
  ]);

  const activePharmacies = pharmacyCounts.find(r => r.is_active === true)?.cnt || 0;
  const inactivePharmacies = pharmacyCounts.find(r => r.is_active === false)?.cnt || 0;
  const totalPatientsCount = totalPatients[0]?.cnt || 0;
  const totalPharmacies = pharmacyCounts.reduce((sum, r) => sum + r.cnt, 0);
  const careAdoptionRate = totalPharmacies > 0
    ? Math.round((care.careEnabledPharmacies / totalPharmacies) * 100) : 0;

  // Block 1: KPIs (8개 — Network / Commerce / Care)
  const kpis: KpiItem[] = [
    { key: 'active-pharmacies', label: '활성 약국', value: activePharmacies, status: 'neutral' },
    { key: 'pending-applications', label: '입점 대기', value: pendingApprovals, status: pendingApprovals > 0 ? 'warning' : 'neutral' },
    { key: 'active-products', label: '판매 상품', value: activeProducts, status: 'neutral' },
    { key: 'total-orders', label: '총 주문', value: 0, status: 'neutral' }, // STUB: E-commerce Core 미통합
    { key: 'total-patients', label: '등록 환자', value: totalPatientsCount, status: 'neutral' },
    { key: 'high-risk-patients', label: '고위험 환자', value: care.highRiskPatients, status: care.highRiskPatients > 0 ? 'warning' : 'neutral' },
    { key: 'care-adoption-rate', label: 'Care 도입률', value: `${careAdoptionRate}%`, status: careAdoptionRate < 30 ? 'warning' : 'neutral' },
    { key: 'open-care-alerts', label: '미처리 알림', value: care.openCareAlerts, status: care.openCareAlerts > 0 ? 'warning' : 'neutral' },
  ];

  // Block 2: AI Summary (Copilot Engine)
  const copilotMetrics = {
    pharmacies: { active: activePharmacies, inactive: inactivePharmacies },
    applications: { pending: pendingApprovals },
    products: { active: activeProducts, draft: draftProducts, total: totalProducts },
    care: {
      patients: totalPatientsCount,
      highRisk: care.highRiskPatients,
      openAlerts: care.openCareAlerts,
      adoptionRate: careAdoptionRate,
      weeklyActivity: care.weeklyCareActivity,
    },
  };
  const { insights: aiSummary } = await copilotEngine.generateInsights(
    'glycopharm', copilotMetrics, { id: userId, role: 'glycopharm:operator' },
  );

  // Block 3: Action Queue
  const actionQueue: ActionItem[] = [
    { id: 'pending-apps', label: '입점 신청 대기', count: pendingApprovals, link: '/operator/applications' },
    { id: 'draft-products', label: '임시저장 상품', count: draftProducts, link: '/operator/products?status=draft' },
    { id: 'care-alerts', label: '케어 알림 미확인', count: care.openCareAlerts, link: '/operator/care/alerts' },
  ];

  // Block 4: Activity Log
  const applicationItems: ActivityItem[] = recentApplications.map((app, i) => ({
    id: `app-${i}`,
    message: `${app.organizationName} — 입점 신청 (${app.organizationType})`,
    timestamp: app.submittedAt?.toISOString?.() || new Date().toISOString(),
  }));
  const activityLog = mergeActivityLog(
    applicationItems,
    buildCareActivityItems(care.recentCareAlerts),
    buildAuditActivityItems(recentAuditActions, 'glycopharm'),
  );

  // Block 5: Quick Actions
  const quickActions: QuickActionItem[] = [
    { id: 'manage-pharmacies', label: '약국 관리', link: '/operator/pharmacies', icon: 'store' },
    { id: 'manage-products', label: '상품 관리', link: '/operator/products', icon: 'package' },
    { id: 'manage-applications', label: '입점 심사', link: '/operator/applications', icon: 'clipboard' },
    { id: 'manage-care', label: '케어 관리', link: '/operator/care', icon: 'heart' },
    { id: 'manage-content', label: '콘텐츠 관리', link: '/operator/content', icon: 'file-text' },
  ];

  // Block 6: Operator Alerts
  const operatorAlerts = computeOperatorAlerts({
    openCareAlerts: care.openCareAlerts,
    careAdoptionRate,
    highRiskPatients: care.highRiskPatients,
    weeklyCareActivity: care.weeklyCareActivity,
    pendingApplications: pendingApprovals,
    draftProducts,
  });

  return { kpis, aiSummary, operatorAlerts, actionQueue, activityLog, quickActions };
}
