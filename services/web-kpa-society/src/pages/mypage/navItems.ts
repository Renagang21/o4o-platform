import type { MyPageNavItem } from '@o4o/account-ui';

// WO-MYPAGE-STATE-BASED-IA-REDEFINITION-V1: 상태 기준 IA 재정렬
// Summary → Relation → Activity → Request → Result → Asset → Config
export const KPA_MYPAGE_NAV_ITEMS: MyPageNavItem[] = [
  { label: '홈', path: '' },                   // Summary
  { label: '프로필', path: '/profile' },         // Relation
  { label: '내 포럼', path: '/my-forums' },      // Relation
  { label: '내 수강', path: '/enrollments' },    // Activity
  { label: '내 신청', path: '/my-requests' },    // Request
  { label: '학습 결과', path: '/certificates' }, // Result (이수현황 → 학습 결과)
  { label: '내 자격', path: '/qualifications' }, // Result (NEW)
  { label: '크레딧', path: '/credits' },         // Asset
  { label: '설정', path: '/settings' },          // Config
];
