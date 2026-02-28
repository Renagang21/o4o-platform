/**
 * organization-dashboard-map.ts
 * organizationType × organizationRole 기반 대시보드 카드 레이아웃 매핑
 *
 * WO-KPA-B-ORG-LEVEL-DASHBOARD-DIFF-V1
 *
 * 분기 키: `${organizationType}:${organizationRole}`
 * 6개 조합:
 *   district:admin / district:operator / district:member
 *   branch:admin   / branch:operator   / branch:member
 *
 * 패턴: KPA-a activity-dashboard-map.ts와 동일 구조
 */

/** 조직 대시보드 카드 식별자 */
export type OrgDashboardCardKey =
  // ── District (지부) 전용 ──
  | 'district-overview-kpi'
  | 'district-kpi'
  | 'district-hierarchy'
  | 'branch-management'
  | 'district-operators'
  | 'district-member-stats'
  | 'district-announcements-mgmt'
  | 'district-events-mgmt'
  | 'district-branch-stats'
  | 'district-events'
  | 'district-announcements'
  | 'district-member-lookup'
  | 'district-news'
  | 'district-community'
  // ── Branch (분회) 전용 ──
  | 'branch-status'
  | 'member-approval'
  | 'branch-member-approval'
  | 'operator-management'
  | 'branch-stats'
  | 'branch-events-mgmt'
  | 'post-management'
  | 'branch-events'
  | 'branch-info'
  | 'branch-announcements'
  | 'branch-community'
  // ── Instructor/Course Approval (WO-KPA-B-LMS-GUARD-BYPASS-AUDIT-AND-IMPLEMENTATION-V1) ──
  | 'branch-instructor-qualifications'
  | 'branch-course-requests'
  // ── Forum Approval (WO-PLATFORM-FORUM-APPROVAL-CORE-DECOUPLING-V1) ──
  | 'branch-forum-requests';

/**
 * organizationType:organizationRole → 카드 배열 매핑
 *
 * District (지부) — 상위 관리 단위
 *   admin:    산하 분회 KPI, 분회 관리, 운영자, 회원 통계, 공문, 행사 총괄
 *   operator: 분회 통계, 행사/교육, 공지, 회원 조회
 *   member:   지부 공지, 행사, 커뮤니티
 *
 * Branch (분회) — 실행 단위 조직
 *   admin:    회원 승인, 운영자 지정, 통계, 행사/교육, 게시물
 *   operator: 회원 승인, 게시물, 행사
 *   member:   분회 정보, 공지, 행사, 커뮤니티
 */
export const ORG_DASHBOARD_LAYOUT: Record<string, OrgDashboardCardKey[]> = {
  // ── District ──
  'district:admin': [
    'district-overview-kpi',
    'district-hierarchy',
    'branch-management',
    'district-operators',
    'district-member-stats',
    'district-announcements-mgmt',
    'district-events-mgmt',
  ],
  'district:operator': [
    'district-branch-stats',
    'district-events',
    'district-announcements',
    'district-member-lookup',
  ],
  'district:member': [
    'district-news',
    'district-events',
    'district-community',
  ],

  // ── Branch ──
  'branch:admin': [
    'branch-status',
    'branch-member-approval',
    'branch-instructor-qualifications',
    'branch-course-requests',
    'branch-forum-requests',
    'operator-management',
    'branch-stats',
    'branch-events-mgmt',
    'post-management',
  ],
  'branch:operator': [
    'branch-status',
    'member-approval',
    'post-management',
    'branch-events',
  ],
  'branch:member': [
    'branch-info',
    'branch-announcements',
    'branch-events',
    'branch-community',
  ],
};

/** fallback: organizationType/Role 미설정 시 member 레이아웃 */
const DEFAULT_LAYOUT: OrgDashboardCardKey[] = [
  'branch-info',
  'branch-announcements',
  'branch-events',
  'branch-community',
];

/**
 * organizationType × organizationRole로 대시보드 레이아웃 결정
 */
export function getOrgDashboardLayout(
  organizationType?: string | null,
  organizationRole?: string | null,
): OrgDashboardCardKey[] {
  if (organizationType && organizationRole) {
    const key = `${organizationType}:${organizationRole}`;
    if (ORG_DASHBOARD_LAYOUT[key]) {
      return ORG_DASHBOARD_LAYOUT[key];
    }
  }
  return DEFAULT_LAYOUT;
}
