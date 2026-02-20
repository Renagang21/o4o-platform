/**
 * WO-CARE-MENU-ENTRY-STRUCTURE-V1
 * GlycoPharm 역할 기반 기본 경로 결정
 *
 * - pharmacy 역할: /care (Care 대시보드)
 * - 기존 '/pharmacy' 경로는 제거됨 (WO-PHARMACY-FULL-REMOVAL-V1)
 */
import type { UserRole } from '@/types';

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin: '/admin',
  pharmacy: '/care',  // WO-CARE-MENU-ENTRY-STRUCTURE-V1
  supplier: '/supplier',
  partner: '/partner',
  operator: '/operator',
  consumer: '/',
};

export function getDefaultRouteByRole(role?: UserRole): string {
  if (!role) return '/';
  return ROLE_DASHBOARDS[role] || '/';
}
