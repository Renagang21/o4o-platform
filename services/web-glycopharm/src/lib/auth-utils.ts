/**
 * WO-GLYCOPHARM-ROLE-BASED-LANDING-V1 + WO-MENU-REALIGN-V1
 * GlycoPharm 역할 기반 기본 경로 결정
 *
 * WO-MENU-REALIGN-V1:
 * - pharmacy 역할: / (Home = CareDashboard)
 * - 기존 '/pharmacy' 경로는 제거됨 (WO-PHARMACY-FULL-REMOVAL-V1)
 */
import type { UserRole } from '@/types';

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin: '/admin',
  pharmacy: '/',  // WO-MENU-REALIGN-V1: CareDashboard가 Home
  supplier: '/supplier',
  partner: '/partner',
  operator: '/operator',
  consumer: '/',
};

export function getDefaultRouteByRole(role?: UserRole): string {
  if (!role) return '/';
  return ROLE_DASHBOARDS[role] || '/';
}
