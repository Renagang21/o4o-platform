/**
 * KPA Society Operator Menu Items
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * 표준 11-그룹 키에 대한 라우트 매핑.
 */

import type { OperatorGroupKey, OperatorMenuItem } from '@o4o/ui';

export const OPERATOR_MENU_ITEMS: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> = {
  dashboard: [{ label: '대시보드', path: '/operator', exact: true }],
  users: [
    { label: '회원 관리', path: '/operator/members' },
    { label: '조직 가입 요청', path: '/operator/organization-requests' },
    { label: '약국 서비스 신청', path: '/operator/pharmacy-requests' },
  ],
  approvals: [{ label: '상품 신청 관리', path: '/operator/product-applications' }],
  stores: [
    { label: '매장 관리', path: '/operator/stores' },
    { label: '채널 관리', path: '/operator/store-channels' },
  ],
  content: [
    { label: '공지사항', path: '/operator/news' },
    { label: '자료실', path: '/operator/docs' },
    { label: '콘텐츠 관리', path: '/operator/content' },
  ],
  signage: [
    { label: '콘텐츠 허브', path: '/operator/signage/content' },
    { label: 'HQ 미디어', path: '/operator/signage/hq-media' },
    { label: 'HQ 플레이리스트', path: '/operator/signage/hq-playlists' },
    { label: '템플릿', path: '/operator/signage/templates' },
  ],
  forum: [
    { label: '커뮤니티 관리', path: '/operator/community' },
    { label: '포럼 관리', path: '/operator/forum-management' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
    { label: '게시판', path: '/operator/forum' },
  ],
  analytics: [{ label: 'AI 리포트', path: '/operator/ai-report' }],
  system: [
    { label: '법률 관리', path: '/operator/legal' },
    { label: '감사 로그', path: '/operator/audit-logs' },
    { label: '회원 관리 (통합)', path: '/operator/users' },
    { label: '역할 관리', path: '/operator/roles' },
  ],
};
