/**
 * dashboard-cards.tsx - 대시보드 카드 Registry
 *
 * WO-KPA-A-ACTIVITY-BASED-DASHBOARD-DIFF-V1
 *
 * 각 카드 컴포넌트를 key로 매핑.
 * UserDashboardPage가 activity-dashboard-map에서 결정한 key 배열로
 * 이 registry를 조회하여 렌더링.
 */

import { Link } from 'react-router-dom';
import type { User } from '../../contexts/AuthContext';
import { ACTIVITY_TYPE_LABELS } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';
import type { DashboardCardKey } from './activity-dashboard-map';

// ─── 공통 Props ───────────────────────────────────
interface CardProps {
  user: User;
}

// ─── 1. 회원 상태 카드 ───────────────────────────────
function MemberStatusCard({ user }: CardProps) {
  const isStudent = user.membershipType === 'student';
  const roleLabel = user.activityType ? ACTIVITY_TYPE_LABELS[user.activityType] : null;

  return (
    <section style={cardStyles.card}>
      <div style={cardStyles.statusHeader}>
        <div>
          <h3 style={cardStyles.statusName}>{user.name}</h3>
          <p style={cardStyles.statusEmail}>{user.email}</p>
        </div>
        <div style={cardStyles.badgeRow}>
          <span style={isStudent ? cardStyles.badgeStudent : cardStyles.badgePharmacist}>
            {isStudent ? '약대생' : '약사'}
          </span>
          {roleLabel && !isStudent && (
            <span style={cardStyles.badgeRole}>{roleLabel}</span>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── 2. 커뮤니티 바로가기 ─────────────────────────────
const COMMUNITY_SHORTCUTS = [
  { label: '포럼', icon: '💬', href: '/forum' },
  { label: '공지사항', icon: '📢', href: '/news' },
  { label: '교육/연수', icon: '📚', href: '/lms' },
  { label: '자료실', icon: '📁', href: '/docs' },
];

function CommunityShortcutsCard(_props: CardProps) {
  return (
    <section>
      <h3 style={cardStyles.sectionTitle}>커뮤니티 바로가기</h3>
      <div style={cardStyles.shortcutGrid}>
        {COMMUNITY_SHORTCUTS.map((item) => (
          <Link key={item.href} to={item.href} style={cardStyles.shortcutCard}>
            <span style={cardStyles.shortcutIcon}>{item.icon}</span>
            <span style={cardStyles.shortcutLabel}>{item.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── 3. 약국경영 카드 (pharmacy_owner) ──────────────────
function StoreManagementCard(_props: CardProps) {
  return (
    <section>
      <h3 style={cardStyles.sectionTitle}>약국경영</h3>
      <div style={{ ...cardStyles.card, borderColor: colors.primary, borderWidth: '2px' }}>
        <div style={cardStyles.featureHeader}>
          <span style={cardStyles.featureIcon}>💊</span>
          <div>
            <h4 style={cardStyles.featureTitle}>약국경영 서비스</h4>
            <p style={cardStyles.featureDesc}>약국 운영에 필요한 경영지원 서비스를 이용할 수 있습니다.</p>
          </div>
        </div>
        <Link to="/pharmacy" style={cardStyles.actionButton}>
          약국경영 서비스 바로가기 →
        </Link>
      </div>
    </section>
  );
}

// ─── 4. 공동구매 카드 ──────────────────────────────────
function GroupbuyCard(_props: CardProps) {
  return (
    <section>
      <h3 style={cardStyles.sectionTitle}>공동구매</h3>
      <div style={cardStyles.card}>
        <div style={cardStyles.featureHeader}>
          <span style={cardStyles.featureIcon}>🛒</span>
          <div>
            <h4 style={cardStyles.featureTitle}>약사회 공동구매</h4>
            <p style={cardStyles.featureDesc}>약사회 회원 전용 공동구매 상품을 확인하세요.</p>
          </div>
        </div>
        <Link to="/groupbuy" style={cardStyles.actionButtonSecondary}>
          공동구매 보기 →
        </Link>
      </div>
    </section>
  );
}

// ─── 5. 교육/연수 카드 ─────────────────────────────────
function EducationCard(_props: CardProps) {
  return (
    <section>
      <h3 style={cardStyles.sectionTitle}>교육/연수</h3>
      <div style={cardStyles.card}>
        <div style={cardStyles.featureHeader}>
          <span style={cardStyles.featureIcon}>🎓</span>
          <div>
            <h4 style={cardStyles.featureTitle}>온라인 교육</h4>
            <p style={cardStyles.featureDesc}>약사 보수교육, 전문 강의 등 다양한 교육 콘텐츠를 수강하세요.</p>
          </div>
        </div>
        <Link to="/lms" style={cardStyles.actionButtonSecondary}>
          교육 보기 →
        </Link>
      </div>
    </section>
  );
}

// ─── 6. 학술 카드 (hospital) ───────────────────────────
function AcademicCard(_props: CardProps) {
  return (
    <section>
      <h3 style={cardStyles.sectionTitle}>학술/연구</h3>
      <div style={cardStyles.card}>
        <div style={cardStyles.featureHeader}>
          <span style={cardStyles.featureIcon}>🔬</span>
          <div>
            <h4 style={cardStyles.featureTitle}>학술 자료</h4>
            <p style={cardStyles.featureDesc}>병원 약사를 위한 학술 자료와 연구 정보를 확인하세요.</p>
          </div>
        </div>
        <div style={cardStyles.linkRow}>
          <Link to="/lms" style={cardStyles.inlineLink}>교육/연수 →</Link>
          <Link to="/docs" style={cardStyles.inlineLink}>자료실 →</Link>
        </div>
      </div>
    </section>
  );
}

// ─── 7. 파트너/산업 카드 (manufacturer/wholesaler) ──────
function PartnerCard(_props: CardProps) {
  return (
    <section>
      <h3 style={cardStyles.sectionTitle}>산업/파트너</h3>
      <div style={cardStyles.card}>
        <div style={cardStyles.featureHeader}>
          <span style={cardStyles.featureIcon}>🤝</span>
          <div>
            <h4 style={cardStyles.featureTitle}>파트너 서비스</h4>
            <p style={cardStyles.featureDesc}>제약/유통 업계 전용 파트너 네트워크 및 협업 도구를 활용하세요.</p>
          </div>
        </div>
        <Link to="/forum" style={cardStyles.actionButtonSecondary}>
          커뮤니티 참여 →
        </Link>
      </div>
    </section>
  );
}

// ─── 8. 약대생 안내 카드 ────────────────────────────────
function StudentInfoCard(_props: CardProps) {
  return (
    <section style={cardStyles.studentSection}>
      <h3 style={cardStyles.studentTitle}>약대생 안내</h3>
      <p style={cardStyles.studentText}>
        졸업 후 약사면허를 취득하시면 약사 회원으로 전환할 수 있습니다.
        전환 시 직능/직역 선택 및 약국경영 서비스 등 추가 기능을 이용할 수 있습니다.
      </p>
      <Link to="/mypage/profile" style={cardStyles.studentLink}>
        내 프로필 보기 →
      </Link>
    </section>
  );
}

// ─── 9. 알림 placeholder ────────────────────────────────
function NotificationsCard(_props: CardProps) {
  return (
    <section style={cardStyles.notificationPlaceholder}>
      <span style={cardStyles.notificationIcon}>🔔</span>
      <p style={cardStyles.notificationText}>알림 기능 준비 중입니다</p>
    </section>
  );
}

// ─── Card Registry ──────────────────────────────────────
export const CARD_REGISTRY: Record<DashboardCardKey, React.FC<CardProps>> = {
  'member-status': MemberStatusCard,
  'community-shortcuts': CommunityShortcutsCard,
  'store-management': StoreManagementCard,
  'groupbuy': GroupbuyCard,
  'education': EducationCard,
  'academic': AcademicCard,
  'partner': PartnerCard,
  'student-info': StudentInfoCard,
  'notifications': NotificationsCard,
};

// ─── 공통 스타일 ────────────────────────────────────────
const cardStyles: Record<string, React.CSSProperties> = {
  // 기본 카드
  card: {
    background: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral200}`,
    boxShadow: shadows.sm,
    padding: spacing.lg,
  },

  // 섹션 제목
  sectionTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: `0 0 ${spacing.md} 0`,
  } as React.CSSProperties,

  // 회원 상태
  statusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusName: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: 0,
  } as React.CSSProperties,
  statusEmail: {
    ...typography.bodyM,
    color: colors.neutral500,
    margin: `${spacing.xs} 0 0 0`,
  } as React.CSSProperties,
  badgeRow: {
    display: 'flex',
    gap: spacing.sm,
    alignItems: 'center',
  },
  badgePharmacist: {
    ...typography.bodyS,
    background: `${colors.primary}15`,
    color: colors.primary,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.md,
    fontWeight: 600,
  } as React.CSSProperties,
  badgeStudent: {
    ...typography.bodyS,
    background: '#05966915',
    color: colors.accentGreen,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.md,
    fontWeight: 600,
  } as React.CSSProperties,
  badgeRole: {
    ...typography.bodyS,
    background: colors.neutral100,
    color: colors.neutral600,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.md,
  } as React.CSSProperties,

  // 바로가기 그리드
  shortcutGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
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
  shortcutIcon: {
    fontSize: '1.5rem',
  },
  shortcutLabel: {
    ...typography.bodyM,
    color: colors.neutral700,
    fontWeight: 500,
  } as React.CSSProperties,

  // Feature 카드 내부
  featureHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  featureIcon: {
    fontSize: '2rem',
    lineHeight: 1,
  },
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

  // 액션 버튼
  actionButton: {
    display: 'block',
    textAlign: 'center',
    padding: `${spacing.md} ${spacing.lg}`,
    background: colors.primary,
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
    color: colors.primary,
    borderRadius: borderRadius.md,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.875rem',
    border: `1px solid ${colors.neutral200}`,
  } as React.CSSProperties,

  // 인라인 링크 행
  linkRow: {
    display: 'flex',
    gap: spacing.lg,
  },
  inlineLink: {
    ...typography.bodyM,
    color: colors.primary,
    fontWeight: 600,
    textDecoration: 'none',
  } as React.CSSProperties,

  // 알림 placeholder
  notificationPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    background: colors.neutral50,
    borderRadius: borderRadius.lg,
    border: `2px dashed ${colors.neutral300}`,
  },
  notificationIcon: {
    fontSize: '1.5rem',
  },
  notificationText: {
    ...typography.bodyM,
    color: colors.neutral400,
  } as React.CSSProperties,

  // 약대생 전용
  studentSection: {
    background: '#05966908',
    border: '1px solid #05966920',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  studentTitle: {
    ...typography.headingS,
    color: colors.accentGreen,
    margin: `0 0 ${spacing.sm} 0`,
  } as React.CSSProperties,
  studentText: {
    ...typography.bodyM,
    color: colors.neutral700,
    margin: 0,
    lineHeight: 1.8,
  } as React.CSSProperties,
  studentLink: {
    ...typography.bodyM,
    color: colors.accentGreen,
    fontWeight: 600,
    textDecoration: 'none',
    display: 'inline-block',
    marginTop: spacing.md,
  } as React.CSSProperties,
};
