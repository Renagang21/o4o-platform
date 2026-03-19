/**
 * GlucoseView Operator Menu Items
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * 표준 11-그룹 키에 대한 라우트 매핑.
 */

import type { OperatorGroupKey, OperatorMenuItem } from '@o4o/ui';

export const OPERATOR_MENU_ITEMS: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> = {
  dashboard: [{ label: '대시보드', path: '/operator', exact: true }],
  users: [{ label: '회원 관리', path: '/operator/users' }],
  approvals: [{ label: '신청 관리', path: '/operator/applications' }],
  products: [{ label: '상품 관리', path: '/operator/products' }],
  stores: [{ label: '매장 관리', path: '/operator/stores' }],
  analytics: [{ label: 'AI 리포트', path: '/operator/ai-report' }],
  system: [{ label: '역할 관리', path: '/operator/roles' }],
};
