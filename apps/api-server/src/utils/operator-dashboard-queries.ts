/**
 * Shared Operator Dashboard Query Helpers
 *
 * WO-O4O-OPERATOR-CODE-CLEANUP-AND-REFRACTOR-V1
 *
 * Common care/audit queries used by both GlycoPharm and GlucoseView
 * operator dashboards. Eliminates duplicate SQL across controllers.
 */

import type { DataSource } from 'typeorm';
import type { ActivityItem } from '../types/operator-dashboard.types.js';
import logger from './logger.js';

// === Query Result Types ===

export interface CareAlertRow {
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
}

export interface AuditActionRow {
  action_key: string;
  meta: any;
  created_at: string;
}

export interface CareMetrics {
  highRiskPatients: number;
  openCareAlerts: number;
  recentCareAlerts: CareAlertRow[];
  careEnabledPharmacies: number;
  weeklyCareActivity: number;
}

// === Shared Queries ===

export async function fetchCareMetrics(dataSource: DataSource, serviceCode?: string): Promise<CareMetrics> {
  // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: filter care tables by service via organization_service_enrollments
  const svcFilter = serviceCode
    ? `JOIN organization_service_enrollments ose ON ose.organization_id = t.pharmacy_id AND ose.service_code = $1`
    : '';
  const svcParams = serviceCode ? [serviceCode] : [];

  // WO-O4O-DASHBOARD-QUERY-STABILITY-V1: individual .catch() per query
  const [highRisk, openAlerts, recentAlerts, careEnabled, weeklyActivity] = await Promise.all([
    dataSource.query(`
      SELECT COUNT(DISTINCT t.patient_id)::int AS cnt
      FROM care_kpi_snapshots t ${svcFilter} WHERE t.risk_level = 'high'
    `, svcParams).catch((e) => { logger.warn('[CareMetrics] highRisk query failed:', e.message); return [{ cnt: 0 }]; }) as Promise<Array<{ cnt: number }>>,
    dataSource.query(`
      SELECT COUNT(*)::int AS cnt FROM care_alerts t ${svcFilter} WHERE t.status = 'open'
    `, svcParams).catch((e) => { logger.warn('[CareMetrics] openAlerts query failed:', e.message); return [{ cnt: 0 }]; }) as Promise<Array<{ cnt: number }>>,
    dataSource.query(`
      SELECT t.alert_type, t.severity, t.message, t.created_at
      FROM care_alerts t ${svcFilter}
      ORDER BY t.created_at DESC
      LIMIT 3
    `, svcParams).catch((e) => { logger.warn('[CareMetrics] recentAlerts query failed:', e.message); return []; }) as Promise<CareAlertRow[]>,
    dataSource.query(`
      SELECT COUNT(DISTINCT t.pharmacy_id)::int AS cnt FROM care_kpi_snapshots t ${svcFilter}
    `, svcParams).catch((e) => { logger.warn('[CareMetrics] careEnabled query failed:', e.message); return [{ cnt: 0 }]; }) as Promise<Array<{ cnt: number }>>,
    dataSource.query(`
      SELECT COUNT(*)::int AS cnt FROM care_coaching_sessions t ${svcFilter}
      WHERE t.created_at > NOW() - INTERVAL '7 days'
    `, svcParams).catch((e) => { logger.warn('[CareMetrics] weeklyActivity query failed:', e.message); return [{ cnt: 0 }]; }) as Promise<Array<{ cnt: number }>>,
  ]);

  return {
    highRiskPatients: highRisk[0]?.cnt || 0,
    openCareAlerts: openAlerts[0]?.cnt || 0,
    recentCareAlerts: recentAlerts,
    careEnabledPharmacies: careEnabled[0]?.cnt || 0,
    weeklyCareActivity: weeklyActivity[0]?.cnt || 0,
  };
}

export async function fetchRecentAuditActions(
  dataSource: DataSource,
  serviceKey: string
): Promise<AuditActionRow[]> {
  // WO-O4O-DASHBOARD-QUERY-STABILITY-V1: .catch() defense
  return dataSource.query(`
    SELECT action_key, meta, created_at
    FROM action_logs
    WHERE service_key = $1 AND source = 'manual'
    ORDER BY created_at DESC
    LIMIT 3
  `, [serviceKey]).catch((e) => { logger.warn('[AuditActions] query failed:', e.message); return []; });
}

// === Activity Log Helpers ===

export function buildCareActivityItems(alerts: CareAlertRow[]): ActivityItem[] {
  return alerts.map((alert, i) => ({
    id: `care-${i}`,
    message: `[${alert.severity}] ${alert.message}`,
    timestamp: alert.created_at || new Date().toISOString(),
  }));
}

export function buildAuditActivityItems(
  actions: AuditActionRow[],
  serviceKey: string
): ActivityItem[] {
  return actions.map((action, i) => ({
    id: `audit-${i}`,
    message: `[운영] ${action.action_key.replace(`${serviceKey}.`, '')}`,
    timestamp: action.created_at || new Date().toISOString(),
  }));
}

export function mergeActivityLog(...sources: ActivityItem[][]): ActivityItem[] {
  return sources
    .flat()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);
}
