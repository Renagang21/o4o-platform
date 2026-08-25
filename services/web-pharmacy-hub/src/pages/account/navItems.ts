/**
 * Pharmacy-Hub My Page navigation config
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1
 *
 * Pharmacy-Hub 는 `/mypage` 축이 없다. 개인 계정 canonical route 는 `/account`
 * 이며(WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1 §13 계약), 이 계약은
 * 유지한다 — `/mypage` 를 새로 만들지 않는다.
 *
 * 따라서 basePath 는 `/account` 이고, 같은 개인 축이지만 basePath 밖에 있는
 * `가입 상태(/join/status)` 는 공통 nav item 의 절대경로(`href`)로 연결한다.
 *
 * 역할 조건 없음 — 두 화면 모두 로그인 사용자 공통이며, 승인 대기·반려
 * 사용자도 접근할 수 있어야 한다(MembershipGate 비적용 경로).
 */

import type { MyPageNavItem } from '@o4o/account-ui';

/**
 * WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1 §17·§18:
 *   LMS learner 개인 화면(내 수강 / 내 수료증 / 내 크레딧)을 같은 `/account` 축에
 *   추가한다. 기능은 있는데 진입점이 없는 deep-link only 상태를 남기지 않는다.
 *   My Page 구조 자체는 재설계하지 않는다 — nav item 추가로 끝낸다.
 */
export const PHARMACY_HUB_ACCOUNT_NAV_ITEMS: MyPageNavItem[] = [
  { label: '내 프로필', path: '', end: true },
  { label: '내 수강', path: '/enrollments' },
  { label: '내 수료증', path: '/certificates' },
  { label: '내 크레딧', path: '/credits' },
  // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §5 (#19·#51)
  { label: '내 신청', path: '/my-requests' },
  { label: '가입 상태', path: '/join/status', href: '/join/status' },
];
