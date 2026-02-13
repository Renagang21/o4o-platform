/**
 * WO-GLYCOPHARM-ROLE-BASED-LANDING-V1
 * GlycoPharm 역할 기반 기본 경로 결정
 */
import type { UserRole } from '@/types';

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  pharmacy: '/pharmacy',
  supplier: '/supplier',
  partner: '/partner',
  operator: '/operator',
  consumer: '/',
};

export function getDefaultRouteByRole(role?: UserRole): string {
  if (!role) return '/';
  return ROLE_DASHBOARDS[role] || '/';
}
