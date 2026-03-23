/**
 * KPA Branch Admin Dashboard — Types & Shared Helpers
 *
 * WO-O4O-BRANCH-ADMIN-DASHBOARD-CONTROLLER-SPLIT-V1
 * Extracted from branch-admin-dashboard.controller.ts
 */

import type { DataSource } from 'typeorm';
import { KpaMember } from '../entities/kpa-member.entity.js';
import { KpaAuditLog } from '../entities/kpa-audit-log.entity.js';

// Response interfaces
// WO-O4O-API-STRUCTURE-NORMALIZATION-PHASE2-V1: placeholder 필드 제거
export interface BranchDashboardStats {
  totalMembers: number;       // 분회 소속 전체 회원
  activeMembers: number;      // 활성 회원
}

export interface RecentActivity {
  id: string;
  type: 'annual_report' | 'membership_fee' | 'member_join' | 'post';
  title: string;
  date: string;
  status: 'pending' | 'completed' | 'rejected';
}

/**
 * Get user's organization ID from membership
 * (유지: kpa:admin bypass 시 kpaMember가 없으므로 fallback 필요)
 */
export async function getUserOrganizationId(
  dataSource: DataSource,
  userId: string
): Promise<string | null> {
  const memberRepo = dataSource.getRepository(KpaMember);
  const member = await memberRepo.findOne({
    where: { user_id: userId },
  });
  return member?.organization_id || null;
}

// WO-KPA-C-BRANCH-CMS-HARDENING-V1: audit log helper
export async function writeAuditLog(
  dataSource: DataSource,
  user: any,
  actionType: string,
  targetType: 'branch_news' | 'branch_officer' | 'branch_doc',
  targetId: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    const auditRepo = dataSource.getRepository(KpaAuditLog);
    await auditRepo.save(auditRepo.create({
      operator_id: user?.id,
      operator_role: (user?.roles || []).find((r: string) => r.startsWith('kpa:')) || 'unknown',
      action_type: actionType as any,
      target_type: targetType as any,
      target_id: targetId,
      metadata,
    }));
  } catch (e) { console.error('[KPA AuditLog] Failed:', e); }
}
