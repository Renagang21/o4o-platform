/**
 * Neture Operator Menu Items
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * 표준 11-그룹 키에 대한 라우트 매핑.
 */

import type { OperatorGroupKey, OperatorMenuItem } from '@o4o/ui';

export const OPERATOR_MENU_ITEMS: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> = {
  dashboard: [{ label: '대시보드', path: '/operator', exact: true }],
  users: [{ label: '회원 관리', path: '/operator/users' }],
  approvals: [
    { label: '가입 승인', path: '/operator/applications' },
    { label: 'Market Trial', path: '/operator/market-trial' },
  ],
  products: [{ label: '공급 현황', path: '/operator/supply' }],
  stores: [{ label: '매장 관리', path: '/operator/stores' }],
  orders: [{ label: '주문 관리', path: '/operator/orders' }],
  content: [{ label: '홈페이지 CMS', path: '/operator/homepage-cms' }],
  signage: [{ label: '사이니지', path: '/operator/signage/hq-media' }],
  forum: [
    { label: '포럼 신청', path: '/operator/community' },
    { label: '삭제 요청', path: '/operator/forum-delete-requests' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
  ],
  analytics: [
    { label: 'AI 리포트', path: '/operator/ai-report' },
    { label: 'AI 카드 리포트', path: '/operator/ai-card-report' },
    { label: 'AI 운영', path: '/operator/ai-operations' },
    { label: 'Asset Quality', path: '/operator/ai/asset-quality' },
    { label: '운영 분석', path: '/operator/analytics' },
  ],
  system: [
    { label: '알림 설정', path: '/operator/settings/notifications' },
    { label: '역할 관리', path: '/operator/roles' },
  ],
};
