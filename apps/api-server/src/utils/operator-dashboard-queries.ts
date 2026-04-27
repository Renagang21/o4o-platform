/**
 * Shared Operator Dashboard Query Helpers
 *
 * WO-O4O-OPERATOR-CODE-CLEANUP-AND-REFRACTOR-V1
 * WO-O4O-GLYCOPHARM-CARE-DEAD-CODE-REMOVAL-V1: Care 관련 코드 제거
 *
 * Audit queries used by GlycoPharm operator dashboard.
 */

import type { DataSource } from 'typeorm';
import type { ActivityItem } from '../types/operator-dashboard.types.js';
import logger from './logger.js';

// === Query Result Types ===

export interface AuditActionRow {
  action_key: string;
  meta: any;
  created_at: string;
}

// === Shared Queries ===

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
