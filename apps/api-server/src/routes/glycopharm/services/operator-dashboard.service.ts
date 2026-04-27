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
import logger from '../../../utils/logger.js';
import {
  fetchRecentAuditActions,
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

  // === Parallel data fetch (service-specific + shared audit) ===
  // WO-O4O-GLYCOPHARM-CARE-DEAD-CODE-REMOVAL-V1: care/patient_health_profiles 쿼리 제거
  const [
    pharmacyCounts,
    pendingApprovals,
    totalProducts,
    activeProducts,
    draftProducts,
    recentApplications,
    recentAuditActions,
  // WO-O4O-DASHBOARD-QUERY-STABILITY-V1: individual .catch() per query
  ] = await Promise.all([
    dataSource.query(`
      SELECT o."isActive" AS is_active, COUNT(*)::int AS cnt
      FROM organizations o
      JOIN organization_service_enrollments ose
        ON ose.organization_id = o.id AND ose.service_code = 'glycopharm'
      GROUP BY o."isActive"
    `).catch((e) => { logger.warn('[GlycoPharmDashboard] pharmacyCounts failed:', e.message); return []; }) as Promise<Array<{ is_active: boolean; cnt: number }>>,
    applicationRepo.count({ where: { status: 'submitted' } }).catch((e) => { logger.warn('[GlycoPharmDashboard] pendingApprovals failed:', e.message); return 0; }),
    productRepo.count().catch((e) => { logger.warn('[GlycoPharmDashboard] totalProducts failed:', e.message); return 0; }),
    productRepo.count({ where: { status: 'active' } }).catch((e) => { logger.warn('[GlycoPharmDashboard] activeProducts failed:', e.message); return 0; }),
    productRepo.count({ where: { status: 'draft' } }).catch((e) => { logger.warn('[GlycoPharmDashboard] draftProducts failed:', e.message); return 0; }),
    applicationRepo.find({
      where: { status: 'submitted' },
      order: { submittedAt: 'DESC' },
      take: 5,
    }).catch((e) => { logger.warn('[GlycoPharmDashboard] recentApplications failed:', e.message); return []; }),
    fetchRecentAuditActions(dataSource, 'glycopharm').catch((e) => { logger.warn('[GlycoPharmDashboard] auditActions failed:', e.message); return []; }),
  ]);

  const activePharmacies = pharmacyCounts.find(r => r.is_active === true)?.cnt || 0;
  const inactivePharmacies = pharmacyCounts.find(r => r.is_active === false)?.cnt || 0;

  // Block 1: KPIs (Network / Commerce)
  // WO-O4O-GLYCOPHARM-CARE-DEAD-CODE-REMOVAL-V1: Care KPI 항목 제거
  const kpis: KpiItem[] = [
    { key: 'active-pharmacies', label: '활성 약국', value: activePharmacies, status: 'neutral' },
    { key: 'pending-applications', label: '입점 대기', value: pendingApprovals, status: pendingApprovals > 0 ? 'warning' : 'neutral' },
    { key: 'active-products', label: '판매 상품', value: activeProducts, status: 'neutral' },
    { key: 'total-orders', label: '총 주문', value: 0, status: 'neutral' }, // STUB: E-commerce Core 미통합
  ];

  // Block 2: AI Summary (Copilot Engine)
  const copilotMetrics = {
    pharmacies: { active: activePharmacies, inactive: inactivePharmacies },
    applications: { pending: pendingApprovals },
    products: { active: activeProducts, draft: draftProducts, total: totalProducts },
  };
  const { insights: aiSummary } = await copilotEngine.generateInsights(
    'glycopharm', copilotMetrics, { id: userId, role: 'glycopharm:operator' },
  );

  // Block 3: Action Queue
  const actionQueue: ActionItem[] = [
    { id: 'pending-apps', label: '입점 신청 대기', count: pendingApprovals, link: '/operator/applications' },
    { id: 'draft-products', label: '임시저장 상품', count: draftProducts, link: '/operator/products?status=draft' },
  ];

  // Block 4: Activity Log
  const applicationItems: ActivityItem[] = recentApplications.map((app, i) => ({
    id: `app-${i}`,
    message: `${app.organizationName} — 입점 신청 (${app.organizationType})`,
    timestamp: app.submittedAt?.toISOString?.() || new Date().toISOString(),
  }));
  const activityLog = mergeActivityLog(
    applicationItems,
    buildAuditActivityItems(recentAuditActions, 'glycopharm'),
  );

  // Block 5: Quick Actions
  const quickActions: QuickActionItem[] = [
    { id: 'manage-pharmacies', label: '약국 관리', link: '/operator/pharmacies', icon: 'store' },
    { id: 'manage-products', label: '상품 관리', link: '/operator/products', icon: 'package' },
    { id: 'manage-applications', label: '입점 심사', link: '/operator/applications', icon: 'clipboard' },
    { id: 'manage-content', label: '콘텐츠 관리', link: '/operator/content', icon: 'file-text' },
  ];

  // Block 6: Operator Alerts
  // WO-O4O-GLYCOPHARM-CARE-DEAD-CODE-REMOVAL-V1: Care 메트릭 → 0 (operator-alert.utils Phase 2에서 제거)
  const operatorAlerts = computeOperatorAlerts({
    openCareAlerts: 0,
    careAdoptionRate: 0,
    highRiskPatients: 0,
    weeklyCareActivity: 0,
    pendingApplications: pendingApprovals,
    draftProducts,
  });

  return { kpis, aiSummary, operatorAlerts, actionQueue, activityLog, quickActions };
}
