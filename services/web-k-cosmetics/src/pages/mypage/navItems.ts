/**
 * K-Cosmetics MyPage Navigation Items
 *
 * WO-O4O-MYPAGE-PHASE1-NAV-ROLEBADGE-CANONICALIZATION-V1
 * 근거: IR-O4O-MYPAGE-PROFILE-UI-CANONICAL-COMMONIZATION-V1
 *
 * MyPageNavigation 의 DEFAULT_ITEMS 는 3개 (홈/프로필/설정) 만 노출하므로
 * K-Cos 의 LMS pages (수강/수료/크레딧) 가 탭으로 보이지 않는 drift 가 있었다.
 * 본 정의는 K-Cos 의 실 존재 route 만 포함하며, label 은 KPA canonical 과
 * 같은 의미로 정렬한다.
 */

import type { MyPageNavItem } from '@o4o/account-ui';

export const KCOS_MYPAGE_NAV_ITEMS: MyPageNavItem[] = [
  { label: '홈', path: '' },
  { label: '프로필', path: '/profile' },
  { label: '내 신청', path: '/my-requests' },
  { label: '내 수강', path: '/enrollments' },
  { label: '학습 결과', path: '/certificates' },
  { label: '크레딧', path: '/credits' },
  { label: '설정', path: '/settings' },
];
