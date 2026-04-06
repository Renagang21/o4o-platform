/**
 * organization-dashboard-cards.tsx
 * 조직 대시보드 카드 Registry (District + Branch)
 *
 * WO-KPA-B-ORG-LEVEL-DASHBOARD-DIFF-V1
 *
 * organizationType × organizationRole 6개 조합에 대응하는 카드 컴포넌트.
 * getOrgDashboardLayout()이 결정한 key 배열로 이 registry를 조회하여 렌더링.
 *
 * 패턴: KPA-a dashboard-cards.tsx와 동일 구조
 */

import { Link } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';
import type { OrgDashboardCardKey } from './organization-dashboard-map';
import { DistrictHierarchySection } from './DistrictHierarchySection';
import { DistrictOverviewKPISection } from './DistrictOverviewKPISection';
import { BranchMemberApprovalPanel } from './BranchMemberApprovalPanel';
import { InstructorQualificationPanel } from './InstructorQualificationPanel';
import { CourseRequestPanel } from './CourseRequestPanel';
import { ForumRequestPanel } from './ForumRequestPanel';

// ─── 공통 Props ───────────────────────────────────
interface CardProps {
  basePath: string;
  orgName: string;
}

// ═══════════════════════════════════════════════════
// District (지부) 카드
// ═══════════════════════════════════════════════════

// ─── D1. 산하 분회 현황 KPI (district:admin) ────────
function DistrictKpiCard(_props: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>산하 분회 현황</h3>
      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <span style={s.kpiIcon}>🏢</span>
          <div>
            <div style={s.kpiLabel}>산하 분회</div>
            <div style={s.kpiValue}>-</div>
          </div>
        </div>
        <div style={s.kpiCard}>
          <span style={s.kpiIcon}>👥</span>
          <div>
            <div style={s.kpiLabel}>전체 회원</div>
            <div style={s.kpiValue}>-</div>
          </div>
        </div>
        <div style={s.kpiCard}>
          <span style={s.kpiIcon}>✅</span>
          <div>
            <div style={s.kpiLabel}>활성 회원</div>
            <div style={s.kpiValue}>-</div>
          </div>
        </div>
        <div style={s.kpiCard}>
          <span style={s.kpiIcon}>⏳</span>
          <div>
            <div style={s.kpiLabel}>승인 대기</div>
            <div style={s.kpiValue}>-</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── D2. 분회 승인/해산 관리 (district:admin) ────────
function BranchManagementCard(_props: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>분회 관리</h3>
      <div style={s.card}>
        <div style={s.featureHeader}>
          <span style={s.featureIcon}>🏛️</span>
          <div>
            <h4 style={s.featureTitle}>분회 승인/해산</h4>
            <p style={s.featureDesc}>산하 분회의 설립 승인, 해산 처리, 정보를 관리합니다.</p>
          </div>
        </div>
        <div style={s.actionButtonSecondary}>분회 목록 관리 →</div>
      </div>
    </section>
  );
}

// ─── D3. 분회 운영자 관리 (district:admin) ───────────
function DistrictOperatorsCard(_props: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>분회 운영자 관리</h3>
      <div style={s.card}>
        <div style={s.featureHeader}>
          <span style={s.featureIcon}>🛡️</span>
          <div>
            <h4 style={s.featureTitle}>운영자 현황</h4>
            <p style={s.featureDesc}>산하 분회의 관리자/운영자 현황을 확인하고 관리합니다.</p>
          </div>
        </div>
        <div style={s.actionButtonSecondary}>운영자 현황 →</div>
      </div>
    </section>
  );
}

// ─── D4. 전체 회원 통계 (district:admin) ─────────────
function DistrictMemberStatsCard(_props: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>회원 통계</h3>
      <div style={s.card}>
        <div style={s.featureHeader}>
          <span style={s.featureIcon}>📊</span>
          <div>
            <h4 style={s.featureTitle}>전체 회원 통계</h4>
            <p style={s.featureDesc}>지부 관할 전체 회원의 가입, 활동, 직능 분포를 확인합니다.</p>
          </div>
        </div>
        <div style={s.actionButtonSecondary}>통계 보기 →</div>
      </div>
    </section>
  );
}

// ─── D5. 공문/공지 관리 (district:admin) ─────────────
function DistrictAnnouncementsMgmtCard(_props: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>공문/공지 관리</h3>
      <div style={s.card}>
        <div style={s.featureHeader}>
          <span style={s.featureIcon}>📌</span>
          <div>
            <h4 style={s.featureTitle}>공문 작성</h4>
            <p style={s.featureDesc}>산하 분회에 전달할 공문, 공지사항을 작성하고 관리합니다.</p>
          </div>
        </div>
        <div style={s.actionButtonPrimary}>새 공문 작성 →</div>
      </div>
    </section>
  );
}

// ─── D6. 행사 총괄 관리 (district:admin) ─────────────
function DistrictEventsMgmtCard(_props: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>행사 총괄</h3>
      <div style={s.card}>
        <div style={s.featureHeader}>
          <span style={s.featureIcon}>🎯</span>
          <div>
            <h4 style={s.featureTitle}>행사/교육 총괄 관리</h4>
            <p style={s.featureDesc}>지부 주관 행사, 교육, 연수를 기획하고 관리합니다.</p>
          </div>
        </div>
        <div style={s.actionButtonSecondary}>행사 관리 →</div>
      </div>
    </section>
  );
}

// ─── D7. 산하 분회 통계 조회 (district:operator) ─────
function DistrictBranchStatsCard(_props: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>산하 분회 통계</h3>
      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <span style={s.kpiIcon}>🏢</span>
          <div>
            <div style={s.kpiLabel}>산하 분회</div>
            <div style={s.kpiValue}>-</div>
          </div>
        </div>
        <div style={s.kpiCard}>
          <span style={s.kpiIcon}>👥</span>
          <div>
            <div style={s.kpiLabel}>전체 회원</div>
            <div style={s.kpiValue}>-</div>
          </div>
        </div>
        <div style={s.kpiCard}>
          <span style={s.kpiIcon}>📝</span>
          <div>
            <div style={s.kpiLabel}>게시물</div>
            <div style={s.kpiValue}>-</div>
          </div>
        </div>
        <div style={s.kpiCard}>
          <span style={s.kpiIcon}>📢</span>
          <div>
            <div style={s.kpiLabel}>공지사항</div>
            <div style={s.kpiValue}>-</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── D8. 행사/교육 관리 (district:operator, member) ──
function DistrictEventsCard({ basePath }: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>행사/교육</h3>
      <div style={s.card}>
        <div style={s.featureHeader}>
          <span style={s.featureIcon}>🎓</span>
          <div>
            <h4 style={s.featureTitle}>지부 행사</h4>
            <p style={s.featureDesc}>지부에서 진행하는 행사, 교육, 연수 일정을 확인하세요.</p>
          </div>
        </div>
        <Link to={`${basePath}/news`} style={s.actionButtonSecondary}>
          행사 일정 보기 →
        </Link>
      </div>
    </section>
  );
}

// ─── D9. 공지 관리 (district:operator) ───────────────
function DistrictAnnouncementsCard({ basePath }: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>공지 관리</h3>
      <div style={s.card}>
        <div style={s.featureHeader}>
          <span style={s.featureIcon}>📢</span>
          <div>
            <h4 style={s.featureTitle}>공지사항</h4>
            <p style={s.featureDesc}>지부 공지사항을 등록하고 관리합니다.</p>
          </div>
        </div>
        <Link to={`${basePath}/news`} style={s.actionButtonSecondary}>
          공지 관리 →
        </Link>
      </div>
    </section>
  );
}

// ─── D10. 회원 조회 (district:operator) ──────────────
function DistrictMemberLookupCard(_props: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>회원 조회</h3>
      <div style={s.card}>
        <div style={s.featureHeader}>
          <span style={s.featureIcon}>🔍</span>
          <div>
            <h4 style={s.featureTitle}>회원 검색</h4>
            <p style={s.featureDesc}>지부 관할 회원 정보를 조회합니다.</p>
          </div>
        </div>
        <div style={s.actionButtonSecondary}>회원 조회 →</div>
      </div>
    </section>
  );
}

// ─── D11. 지부 공지 (district:member) ────────────────
function DistrictNewsCard({ basePath }: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>지부 공지</h3>
      <div style={s.card}>
        <div style={s.featureHeader}>
          <span style={s.featureIcon}>📢</span>
          <div>
            <h4 style={s.featureTitle}>공지사항</h4>
            <p style={s.featureDesc}>지부 소식과 중요 공지사항을 확인하세요.</p>
          </div>
        </div>
        <Link to={`${basePath}/news`} style={s.actionButtonSecondary}>
          공지 보기 →
        </Link>
      </div>
    </section>
  );
}

// ─── D12. 지부 커뮤니티 (district:member) ────────────
function DistrictCommunityCard({ basePath }: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>커뮤니티</h3>
      <div style={s.shortcutGrid}>
        <Link to={`${basePath}/forum`} style={s.shortcutCard}>
          <span style={s.shortcutIcon}>💬</span>
          <span style={s.shortcutLabel}>포럼</span>
        </Link>
        <Link to={`${basePath}/docs`} style={s.shortcutCard}>
          <span style={s.shortcutIcon}>📁</span>
          <span style={s.shortcutLabel}>자료실</span>
        </Link>
        <Link to={`${basePath}/event-offers`} style={s.shortcutCard}>
          <span style={s.shortcutIcon}>🛒</span>
          <span style={s.shortcutLabel}>이벤트</span>
        </Link>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// Branch (분회) 카드
// ═══════════════════════════════════════════════════

// ─── B1. 분회 현황 KPI (branch:admin, operator) ─────
function BranchStatusCard({ basePath }: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>분회 현황</h3>
      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <span style={s.kpiIcon}>👥</span>
          <div>
            <div style={s.kpiLabel}>전체 회원</div>
            <div style={s.kpiValue}>-</div>
          </div>
        </div>
        <div style={s.kpiCard}>
          <span style={s.kpiIcon}>✅</span>
          <div>
            <div style={s.kpiLabel}>활성 회원</div>
            <div style={s.kpiValue}>-</div>
          </div>
        </div>
        <div style={s.kpiCard}>
          <span style={s.kpiIcon}>📝</span>
          <div>
            <div style={s.kpiLabel}>게시물</div>
            <div style={s.kpiValue}>-</div>
          </div>
        </div>
        <div style={s.kpiCard}>
          <span style={s.kpiIcon}>📢</span>
          <div>
            <div style={s.kpiLabel}>공지사항</div>
            <div style={s.kpiValue}>-</div>
          </div>
        </div>
      </div>
      <Link to={`${basePath}/admin`} style={s.subtleLink}>
        관리 대시보드에서 상세 확인 →
      </Link>
    </section>
  );
}

// ─── B2. 회원 승인 대기 (branch:admin, operator) ────
function MemberApprovalCard({ basePath }: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>회원 승인 대기</h3>
      <div style={s.card}>
        <div style={s.featureHeader}>
          <span style={s.featureIcon}>⏳</span>
          <div>
            <h4 style={s.featureTitle}>승인 대기 회원</h4>
            <p style={s.featureDesc}>가입 신청 후 승인 대기 중인 회원을 관리합니다.</p>
          </div>
        </div>
        <Link to={`${basePath}/admin/members`} style={s.actionButtonPrimary}>
          승인 관리 →
        </Link>
      </div>
    </section>
  );
}

// ─── B3. 운영자 관리 (branch:admin) ──────────────────
function OperatorManagementCard({ basePath }: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>운영자 관리</h3>
      <div style={s.card}>
        <div style={s.featureHeader}>
          <span style={s.featureIcon}>🛡️</span>
          <div>
            <h4 style={s.featureTitle}>분회 운영자</h4>
            <p style={s.featureDesc}>운영자 권한을 부여하거나 관리합니다.</p>
          </div>
        </div>
        <Link to={`${basePath}/operator/operators`} style={s.actionButtonSecondary}>
          운영자 관리 →
        </Link>
      </div>
    </section>
  );
}

// ─── B4. 분회 통계 (branch:admin) ────────────────────
function BranchStatsCard({ basePath }: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>통계/리포트</h3>
      <div style={s.card}>
        <div style={s.featureHeader}>
          <span style={s.featureIcon}>📊</span>
          <div>
            <h4 style={s.featureTitle}>분회 통계</h4>
            <p style={s.featureDesc}>회원 현황, 활동 통계, 연회비 수납 현황을 확인합니다.</p>
          </div>
        </div>
        <Link to={`${basePath}/admin`} style={s.actionButtonSecondary}>
          관리 대시보드 →
        </Link>
      </div>
    </section>
  );
}

// ─── B5. 행사/교육 관리 (branch:admin) ───────────────
function BranchEventsMgmtCard({ basePath }: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>행사/교육 관리</h3>
      <div style={s.card}>
        <div style={s.featureHeader}>
          <span style={s.featureIcon}>🎯</span>
          <div>
            <h4 style={s.featureTitle}>분회 행사</h4>
            <p style={s.featureDesc}>분회 주관 행사, 교육, 연수를 기획하고 관리합니다.</p>
          </div>
        </div>
        <Link to={`${basePath}/operator/news`} style={s.actionButtonSecondary}>
          행사 관리 →
        </Link>
      </div>
    </section>
  );
}

// ─── B6. 게시물 관리 (branch:admin, operator) ────────
function PostManagementCard({ basePath }: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>게시물 관리</h3>
      <div style={s.shortcutGrid}>
        <Link to={`${basePath}/operator/news`} style={s.shortcutCard}>
          <span style={s.shortcutIcon}>📢</span>
          <span style={s.shortcutLabel}>공지사항</span>
        </Link>
        <Link to={`${basePath}/operator/forum`} style={s.shortcutCard}>
          <span style={s.shortcutIcon}>💬</span>
          <span style={s.shortcutLabel}>게시판</span>
        </Link>
        <Link to={`${basePath}/operator/docs`} style={s.shortcutCard}>
          <span style={s.shortcutIcon}>📁</span>
          <span style={s.shortcutLabel}>자료실</span>
        </Link>
      </div>
    </section>
  );
}

// ─── B7. 행사 운영 (branch:operator) ─────────────────
function BranchEventsCard({ basePath }: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>행사/교육</h3>
      <div style={s.card}>
        <div style={s.featureHeader}>
          <span style={s.featureIcon}>🎓</span>
          <div>
            <h4 style={s.featureTitle}>분회 행사</h4>
            <p style={s.featureDesc}>분회에서 진행하는 행사, 교육, 연수 일정을 관리하세요.</p>
          </div>
        </div>
        <Link to={`${basePath}/news`} style={s.actionButtonSecondary}>
          행사 일정 →
        </Link>
      </div>
    </section>
  );
}

// ─── B8. 내 분회 정보 (branch:member) ────────────────
function BranchInfoCard({ basePath, orgName }: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>내 분회</h3>
      <div style={s.card}>
        <div style={s.featureHeader}>
          <span style={s.featureIcon}>🏢</span>
          <div>
            <h4 style={s.featureTitle}>{orgName}</h4>
            <p style={s.featureDesc}>분회 소개, 임원 안내, 연락처 정보를 확인하세요.</p>
          </div>
        </div>
        <div style={s.linkRow}>
          <Link to={`${basePath}/about`} style={s.inlineLink}>분회 소개 →</Link>
          <Link to={`${basePath}/about/officers`} style={s.inlineLink}>임원 안내 →</Link>
          <Link to={`${basePath}/about/contact`} style={s.inlineLink}>연락처 →</Link>
        </div>
      </div>
    </section>
  );
}

// ─── B9. 분회 공지 (branch:member) ───────────────────
function BranchAnnouncementsCard({ basePath }: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>공지사항</h3>
      <div style={s.card}>
        <div style={s.featureHeader}>
          <span style={s.featureIcon}>📢</span>
          <div>
            <h4 style={s.featureTitle}>분회 공지</h4>
            <p style={s.featureDesc}>분회 소식과 중요 공지사항을 확인하세요.</p>
          </div>
        </div>
        <Link to={`${basePath}/news`} style={s.actionButtonSecondary}>
          공지사항 보기 →
        </Link>
      </div>
    </section>
  );
}

// ─── B10. 분회 커뮤니티 (branch:member) ──────────────
function BranchCommunityCard({ basePath }: CardProps) {
  return (
    <section>
      <h3 style={s.sectionTitle}>커뮤니티</h3>
      <div style={s.shortcutGrid}>
        <Link to={`${basePath}/forum`} style={s.shortcutCard}>
          <span style={s.shortcutIcon}>💬</span>
          <span style={s.shortcutLabel}>포럼</span>
        </Link>
        <Link to={`${basePath}/docs`} style={s.shortcutCard}>
          <span style={s.shortcutIcon}>📁</span>
          <span style={s.shortcutLabel}>자료실</span>
        </Link>
        <Link to={`${basePath}/event-offers`} style={s.shortcutCard}>
          <span style={s.shortcutIcon}>🛒</span>
          <span style={s.shortcutLabel}>이벤트</span>
        </Link>
      </div>
    </section>
  );
}

// ─── Card Registry ──────────────────────────────────
export const ORG_CARD_REGISTRY: Record<OrgDashboardCardKey, React.FC<CardProps>> = {
  // District
  'district-overview-kpi': DistrictOverviewKPISection as React.FC<CardProps>,
  'district-kpi': DistrictKpiCard,
  'district-hierarchy': DistrictHierarchySection as React.FC<CardProps>,
  'branch-management': BranchManagementCard,
  'district-operators': DistrictOperatorsCard,
  'district-member-stats': DistrictMemberStatsCard,
  'district-announcements-mgmt': DistrictAnnouncementsMgmtCard,
  'district-events-mgmt': DistrictEventsMgmtCard,
  'district-branch-stats': DistrictBranchStatsCard,
  'district-events': DistrictEventsCard,
  'district-announcements': DistrictAnnouncementsCard,
  'district-member-lookup': DistrictMemberLookupCard,
  'district-news': DistrictNewsCard,
  'district-community': DistrictCommunityCard,
  // Branch
  'branch-status': BranchStatusCard,
  'member-approval': MemberApprovalCard,
  'branch-member-approval': BranchMemberApprovalPanel as React.FC<CardProps>,
  'branch-instructor-qualifications': InstructorQualificationPanel as React.FC<CardProps>,
  'branch-course-requests': CourseRequestPanel as React.FC<CardProps>,
  'branch-forum-requests': ForumRequestPanel as React.FC<CardProps>,
  'operator-management': OperatorManagementCard,
  'branch-stats': BranchStatsCard,
  'branch-events-mgmt': BranchEventsMgmtCard,
  'post-management': PostManagementCard,
  'branch-events': BranchEventsCard,
  'branch-info': BranchInfoCard,
  'branch-announcements': BranchAnnouncementsCard,
  'branch-community': BranchCommunityCard,
};

// ─── 공통 스타일 ────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  card: {
    background: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral200}`,
    boxShadow: shadows.sm,
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: `0 0 ${spacing.md} 0`,
  } as React.CSSProperties,

  // KPI
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  kpiCard: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    background: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral200}`,
    boxShadow: shadows.sm,
  },
  kpiIcon: { fontSize: '1.5rem' },
  kpiLabel: {
    ...typography.bodyS,
    color: colors.neutral500,
  } as React.CSSProperties,
  kpiValue: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: 0,
  } as React.CSSProperties,

  // Feature
  featureHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  featureIcon: { fontSize: '2rem', lineHeight: 1 },
  featureTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: 0,
  } as React.CSSProperties,
  featureDesc: {
    ...typography.bodyM,
    color: colors.neutral600,
    margin: `${spacing.xs} 0 0 0`,
  } as React.CSSProperties,

  // Shortcuts
  shortcutGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: spacing.md,
  },
  shortcutCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    background: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral200}`,
    boxShadow: shadows.sm,
    textDecoration: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
  },
  shortcutIcon: { fontSize: '1.5rem' },
  shortcutLabel: {
    ...typography.bodyM,
    color: colors.neutral700,
    fontWeight: 500,
  } as React.CSSProperties,

  // Buttons
  actionButtonPrimary: {
    display: 'block',
    textAlign: 'center',
    padding: `${spacing.md} ${spacing.lg}`,
    background: '#059669',
    color: colors.white,
    borderRadius: borderRadius.lg,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.9375rem',
  } as React.CSSProperties,
  actionButtonSecondary: {
    display: 'block',
    textAlign: 'center',
    padding: `${spacing.sm} ${spacing.lg}`,
    background: colors.neutral50,
    color: '#059669',
    borderRadius: borderRadius.md,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.875rem',
    border: `1px solid ${colors.neutral200}`,
  } as React.CSSProperties,

  // Links
  linkRow: { display: 'flex', gap: spacing.lg, flexWrap: 'wrap' },
  inlineLink: {
    ...typography.bodyM,
    color: '#059669',
    fontWeight: 600,
    textDecoration: 'none',
  } as React.CSSProperties,
  subtleLink: {
    ...typography.bodyS,
    color: colors.neutral400,
    textDecoration: 'none',
    display: 'block',
    textAlign: 'right',
  } as React.CSSProperties,
};
