/**
 * activity-dashboard-map.ts - activityType별 대시보드 카드 레이아웃 매핑
 *
 * WO-KPA-A-ACTIVITY-BASED-DASHBOARD-DIFF-V1
 *
 * 각 activityType에 노출할 카드 key 배열을 정의.
 * 카드 key는 dashboard-cards.tsx의 CARD_REGISTRY와 1:1 대응.
 */

/** 대시보드 카드 식별자 */
export type DashboardCardKey =
  | 'member-status'
  | 'community-shortcuts'
  | 'store-management'
  | 'groupbuy'
  | 'education'
  | 'academic'
  | 'partner'
  | 'student-info'
  | 'notifications';

/**
 * activityType → 카드 배열 매핑
 *
 * - pharmacy_owner: 경영 중심 (store + groupbuy + community + education)
 * - pharmacy_employee: 커뮤니티 중심
 * - hospital: 학술 중심
 * - manufacturer/wholesaler: 파트너/산업 중심
 * - student: 학습 중심
 * - default: 기본 커뮤니티
 */
export const DASHBOARD_LAYOUT_BY_ACTIVITY: Record<string, DashboardCardKey[]> = {
  pharmacy_owner: [
    'member-status',
    'store-management',
    'groupbuy',
    'community-shortcuts',
    'education',
    'notifications',
  ],
  pharmacy_employee: [
    'member-status',
    'community-shortcuts',
    'education',
    'notifications',
  ],
  hospital: [
    'member-status',
    'academic',
    'community-shortcuts',
    'education',
    'notifications',
  ],
  manufacturer: [
    'member-status',
    'partner',
    'community-shortcuts',
    'notifications',
  ],
  wholesaler: [
    'member-status',
    'partner',
    'community-shortcuts',
    'notifications',
  ],
  government: [
    'member-status',
    'community-shortcuts',
    'education',
    'notifications',
  ],
  other: [
    'member-status',
    'community-shortcuts',
    'education',
    'notifications',
  ],
  inactive: [
    'member-status',
    'community-shortcuts',
    'notifications',
  ],
  student: [
    'member-status',
    'education',
    'community-shortcuts',
    'student-info',
    'notifications',
  ],
};

/** 매핑에 없는 activityType이나 미설정 시 기본 레이아웃 */
const DEFAULT_LAYOUT: DashboardCardKey[] = [
  'member-status',
  'community-shortcuts',
  'education',
  'notifications',
];

/**
 * 사용자의 activityType + membershipType으로 대시보드 레이아웃 결정
 */
export function getDashboardLayout(
  activityType?: string,
  membershipType?: string,
): DashboardCardKey[] {
  // 약대생은 전용 레이아웃
  if (membershipType === 'student') {
    return DASHBOARD_LAYOUT_BY_ACTIVITY.student;
  }

  if (activityType && DASHBOARD_LAYOUT_BY_ACTIVITY[activityType]) {
    return DASHBOARD_LAYOUT_BY_ACTIVITY[activityType];
  }

  return DEFAULT_LAYOUT;
}
