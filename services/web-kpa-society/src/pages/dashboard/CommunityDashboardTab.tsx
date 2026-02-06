/**
 * CommunityDashboardTab - 커뮤니티 대시보드 탭
 *
 * SVC-A: 커뮤니티 서비스 전용
 * Phase 4: 모든 사용자 공통 커뮤니티 탭 내용
 * - 회원 상태 요약
 * - 커뮤니티 바로가기
 * - 알림 placeholder
 * - 약대생 전용 섹션 (조건부)
 *
 * NOTE: 커뮤니티 포럼은 /forum (NOT /demo/forum)
 * /demo/*는 지부/분회 서비스(SVC-B) 전용 — 이 컴포넌트에서 링크 금지
 */

import { Link } from 'react-router-dom';
import { type User, type PharmacistRole } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

const PHARMACIST_ROLE_LABELS: Record<PharmacistRole, string> = {
  general: '일반 약사',
  pharmacy_owner: '약국 개설자',
  hospital: '병원 약사',
  other: '기타',
};

const shortcuts = [
  { label: '포럼', icon: '💬', href: '/forum' },
  { label: '공지사항', icon: '📢', href: '/news' },
  { label: '교육/연수', icon: '📚', href: '/lms' },
  { label: '자료실', icon: '📁', href: '/docs' },
];

interface CommunityDashboardTabProps {
  user: User;
}

export function CommunityDashboardTab({ user }: CommunityDashboardTabProps) {
  const isStudent = user.membershipType === 'student';
  const roleLabel = user.pharmacistRole ? PHARMACIST_ROLE_LABELS[user.pharmacistRole] : null;

  return (
    <div style={styles.container}>
      {/* 회원 상태 요약 */}
      <section style={styles.card}>
        <div style={styles.statusHeader}>
          <div>
            <h3 style={styles.statusName}>{user.name}</h3>
            <p style={styles.statusEmail}>{user.email}</p>
          </div>
          <div style={styles.badgeRow}>
            <span style={isStudent ? styles.badgeStudent : styles.badgePharmacist}>
              {isStudent ? '약대생' : '약사'}
            </span>
            {roleLabel && !isStudent && (
              <span style={styles.badgeRole}>{roleLabel}</span>
            )}
          </div>
        </div>
      </section>

      {/* 커뮤니티 바로가기 */}
      <section>
        <h3 style={styles.sectionTitle}>커뮤니티 바로가기</h3>
        <div style={styles.shortcutGrid}>
          {shortcuts.map((item) => (
            <Link key={item.href} to={item.href} style={styles.shortcutCard}>
              <span style={styles.shortcutIcon}>{item.icon}</span>
              <span style={styles.shortcutLabel}>{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 알림 영역 (placeholder) */}
      <section style={styles.notificationPlaceholder}>
        <span style={styles.notificationIcon}>🔔</span>
        <p style={styles.notificationText}>알림 기능 준비 중입니다</p>
      </section>

      {/* 약대생 전용 섹션 */}
      {isStudent && (
        <section style={styles.studentSection}>
          <h3 style={styles.studentTitle}>약대생 안내</h3>
          <p style={styles.studentText}>
            졸업 후 약사면허를 취득하시면 약사 회원으로 전환할 수 있습니다.
            전환 시 직능/직역 선택 및 약국경영 서비스 등 추가 기능을 이용할 수 있습니다.
          </p>
          <Link to="/mypage/profile" style={styles.studentLink}>
            내 프로필 보기 →
          </Link>
        </section>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sectionGap,
  },

  // 회원 상태 카드
  card: {
    background: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral200}`,
    boxShadow: shadows.sm,
    padding: spacing.lg,
  },
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
  sectionTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: `0 0 ${spacing.md} 0`,
  } as React.CSSProperties,
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
    border: `1px solid #05966920`,
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
