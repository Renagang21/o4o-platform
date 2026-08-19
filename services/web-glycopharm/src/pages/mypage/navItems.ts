/**
 * GlycoPharm My Page navigation config
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1
 *
 * 결함: GlycoPharm 은 7개 /mypage 라우트를 갖고 있으면서 `MyPageLayout` 에
 *       navItems 를 한 번도 주지 않아 공통 기본 3개(마이페이지/프로필/설정)만
 *       렌더됐다. 그 결과 /mypage/enrollments 등 서브 화면에서는 활성 tab 이
 *       없고 옆 기능으로 이동할 수단도 없었다.
 * 교정: KPA / K-Cosmetics 와 같은 축으로 nav config 를 명시한다.
 *
 * 순서는 KPA 의 상태 기준 IA(Summary → Relation → Activity → Request → Result
 * → Asset → Config)를 따른다. GlycoPharm 에 없는 항목(내 포럼·내 자격)은 뺀다.
 * 역할 조건은 없다 — 7개 라우트 모두 로그인 사용자 공통이다.
 */

import type { MyPageNavItem } from '@o4o/account-ui';

export const GLYCOPHARM_MYPAGE_NAV_ITEMS: MyPageNavItem[] = [
  { label: '홈', path: '' },                     // Summary
  { label: '프로필', path: '/profile' },          // Relation
  { label: '내 수강', path: '/enrollments' },     // Activity
  { label: '내 신청', path: '/my-requests' },     // Request
  { label: '학습 결과', path: '/certificates' },  // Result
  { label: '크레딧', path: '/credits' },          // Asset
  { label: '설정', path: '/settings' },           // Config
];
