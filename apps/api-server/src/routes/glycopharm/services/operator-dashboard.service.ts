/**
 * GlycoPharm Operator Dashboard Service
 *
 * WO-O4O-OPERATOR-CODE-CLEANUP-AND-REFRACTOR-V1
 *
 * Data fetching and 5-block response assembly for GlycoPharm operator dashboard.
 * Extracted from operator.controller.ts to reduce controller complexity.
 */

import type { DataSource } from 'typeorm';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
import { generateRuleBasedInsights } from '../../../copilot/insight-rules.js';
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
  userId: string
): Promise<OperatorDashboardConfig> {
  const productRepo = dataSource.getRepository(GlycopharmProduct);

  // === Parallel data fetch (service-specific + shared audit) ===
  // WO-O4O-GLYCOPHARM-CARE-DEAD-CODE-REMOVAL-V1: care/patient_health_profiles 쿼리 제거
  const [
    pharmacyCounts,
    totalProducts,
    activeProducts,
    draftProducts,
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
    productRepo.count().catch((e) => { logger.warn('[GlycoPharmDashboard] totalProducts failed:', e.message); return 0; }),
    productRepo.count({ where: { status: 'active' } }).catch((e) => { logger.warn('[GlycoPharmDashboard] activeProducts failed:', e.message); return 0; }),
    productRepo.count({ where: { status: 'draft' } }).catch((e) => { logger.warn('[GlycoPharmDashboard] draftProducts failed:', e.message); return 0; }),
    fetchRecentAuditActions(dataSource, 'glycopharm').catch((e) => { logger.warn('[GlycoPharmDashboard] auditActions failed:', e.message); return []; }),
  ]);

  const activePharmacies = pharmacyCounts.find(r => r.is_active === true)?.cnt || 0;
  const inactivePharmacies = pharmacyCounts.find(r => r.is_active === false)?.cnt || 0;

  // Block 1: KPIs (Network / Commerce)
  // WO-O4O-GLYCOPHARM-CARE-DEAD-CODE-REMOVAL-V1: Care KPI 항목 제거
  const kpis: KpiItem[] = [
    { key: 'active-pharmacies', label: '활성 약국', value: activePharmacies, status: 'neutral' },
    { key: 'active-products', label: '판매 상품', value: activeProducts, status: 'neutral' },
    { key: 'total-orders', label: '총 주문', value: 0, status: 'neutral' }, // STUB: E-commerce Core 미통합
  ];

  // Block 2: AI Summary (rule-based, no external AI call)
  const copilotMetrics = {
    pharmacies: { active: activePharmacies, inactive: inactivePharmacies },
    products: { active: activeProducts, draft: draftProducts, total: totalProducts },
  };
  const aiSummary = generateRuleBasedInsights('glycopharm', copilotMetrics);

  // Block 3: Action Queue
  const actionQueue: ActionItem[] = [
    { id: 'draft-products', label: '임시저장 상품', count: draftProducts, link: '/operator/products?status=draft' },
  ];

  // Block 4: Activity Log
  const activityLog = mergeActivityLog(
    [],
    buildAuditActivityItems(recentAuditActions, 'glycopharm'),
  );

  // Block 5: Quick Actions
  const quickActions: QuickActionItem[] = [
    { id: 'manage-pharmacies', label: '약국 관리', link: '/operator/pharmacies', icon: 'store' },
    { id: 'manage-products', label: '상품 관리', link: '/operator/products', icon: 'package' },
    { id: 'manage-content', label: '콘텐츠 관리', link: '/operator/content', icon: 'file-text' },
  ];

  // Block 6: Operator Alerts
  // WO-O4O-GLYCOPHARM-CARE-DEAD-CODE-REMOVAL-V1: Care 메트릭 → 0 (operator-alert.utils Phase 2에서 제거)
  const operatorAlerts = computeOperatorAlerts({
    openCareAlerts: 0,
    careAdoptionRate: 0,
    highRiskPatients: 0,
    weeklyCareActivity: 0,
    pendingApplications: 0,
    draftProducts,
  });

  return { kpis, aiSummary, operatorAlerts, actionQueue, activityLog, quickActions };
}
