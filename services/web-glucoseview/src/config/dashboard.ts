/**
 * GlucoseView — Dashboard Route Config
 *
 * WO-O4O-AUTH-FLOW-SIMPLIFICATION-V1
 * Layout.tsx에서 분리된 role priority + dashboard map + role labels.
 */

import { getPrimaryDashboardRoute } from '@o4o/auth-utils';

export const ROLE_LABELS: Record<string, string> = {
  'platform:super_admin': '최고 관리자',
  'glucoseview:admin': '관리자',
  'glucoseview:operator': '운영자',
  'glucoseview:pharmacist': '약사',
  'glucoseview:patient': '당뇨인',
};

export const GV_ROLE_PRIORITY = [
  'platform:super_admin',
  'glucoseview:admin',
  'glucoseview:operator',
  'glucoseview:pharmacist',
  'glucoseview:patient',
  'user',                // legacy: 가입 시 user로 저장됨
  'customer',            // legacy: 가입 시 customer로 저장됨
] as const;

export const GV_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'glucoseview:admin': '/admin',
  'glucoseview:operator': '/operator',
  'glucoseview:pharmacist': '/',
  'glucoseview:patient': '/patient',
  'user': '/patient',        // legacy
  'customer': '/patient',    // legacy
};

export function getGlucoseviewDashboardRoute(roles: string[]): string {
  return getPrimaryDashboardRoute(roles, GV_ROLE_PRIORITY, GV_DASHBOARD_MAP);
}
