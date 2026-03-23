/**
 * GlycoPharm Operator Menu Items
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * 표준 11-그룹 키에 대한 라우트 매핑.
 *
 * GlycoPharm 비표준 그룹 재배치:
 *   Pharmacies → stores, Finance → system, Care → system
 */

import type { OperatorGroupKey, OperatorMenuItem } from '@o4o/ui';

export const OPERATOR_MENU_ITEMS: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> = {
  dashboard: [{ label: '대시보드', path: '/operator', exact: true }],
  users: [{ label: '회원 관리', path: '/operator/users' }],
  approvals: [
    { label: '신청 관리', path: '/operator/applications' },
    { label: '매장 승인', path: '/operator/store-approvals' },
    { label: 'Market Trial', path: '/operator/market-trial' },
  ],
  products: [{ label: '상품 관리', path: '/operator/products' }],
  stores: [
    { label: '약국 관리', path: '/operator/pharmacies' },
    { label: '매장 관리', path: '/operator/stores' },
  ],
  orders: [{ label: '주문 관리', path: '/operator/orders' }],
  content: [
    { label: '가이드라인 관리', path: '/operator/guidelines' },
  ],
  signage: [
    { label: 'HQ 미디어', path: '/operator/signage/hq-media' },
    { label: 'HQ 플레이리스트', path: '/operator/signage/hq-playlists' },
    { label: '템플릿', path: '/operator/signage/templates' },
    { label: '콘텐츠 허브', path: '/operator/signage/content' },
    { label: '콘텐츠 라이브러리', path: '/operator/signage/library' },
  ],
  forum: [
    { label: '포럼 관리', path: '/operator/forum-management' },
    { label: '포럼 신청', path: '/operator/forum-requests' },
    { label: '커뮤니티 관리', path: '/operator/community' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
  ],
  analytics: [
    { label: 'AI 리포트', path: '/operator/ai-report' },
    { label: 'AI 사용량', path: '/operator/ai-usage' },
    { label: 'AI 정산', path: '/operator/ai-billing' },
    { label: '운영 분석', path: '/operator/analytics' },
  ],
  system: [
    { label: '정산 관리', path: '/operator/settlements' },
    { label: '청구 리포트', path: '/operator/reports' },
    { label: '청구 미리보기', path: '/operator/billing-preview' },
    { label: '인보이스', path: '/operator/invoices' },
    { label: '케어 현황', path: '/operator/care' },
    { label: '케어 알림', path: '/operator/care/alerts' },
    { label: '서비스 설정', path: '/operator/settings' },
    { label: '역할 관리', path: '/operator/roles' },
  ],
};
