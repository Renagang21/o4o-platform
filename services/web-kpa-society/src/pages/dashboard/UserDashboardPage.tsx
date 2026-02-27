/**
 * UserDashboardPage - 사용자 대시보드
 *
 * WO-KPA-A-ACTIVITY-BASED-DASHBOARD-DIFF-V1
 *
 * activityType 기반 카드 레이아웃:
 * - getDashboardLayout()로 카드 key 배열 결정
 * - CARD_REGISTRY에서 카드 컴포넌트 조회/렌더링
 * - 하드코딩 탭 제거, activityType에 따라 자동 구성
 *
 * 라우트: /dashboard
 */

import { Navigate } from 'react-router-dom';
import { useAuth, ACTIVITY_TYPE_LABELS } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { getDashboardLayout } from './activity-dashboard-map';
import { CARD_REGISTRY } from './dashboard-cards';

export function UserDashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const isStudent = user.membershipType === 'student';
  const roleLabel = user.activityType ? ACTIVITY_TYPE_LABELS[user.activityType] : null;
  const cardKeys = getDashboardLayout(user.activityType, user.membershipType);

  return (
    <div style={styles.page}>
      {/* Welcome 헤더 */}
      <section style={styles.welcomeSection}>
        <div style={styles.welcomeContent}>
          <div>
            <h1 style={styles.welcomeTitle}>
              {user.name}님, 환영합니다
            </h1>
            <div style={styles.welcomeMeta}>
              <span style={isStudent ? styles.typeBadgeStudent : styles.typeBadgePharmacist}>
                {isStudent ? '약대생' : '약사'}
              </span>
              {roleLabel && !isStudent && (
                <span style={styles.roleBadge}>{roleLabel}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* activityType 기반 카드 레이아웃 */}
      <main style={styles.cardContainer}>
        {cardKeys.map(key => {
          const Card = CARD_REGISTRY[key];
          return Card ? <Card key={key} user={user} /> : null;
        })}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: `${spacing.xl} ${spacing.md}`,
  },

  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '300px',
    color: colors.neutral500,
  },

  // Welcome 헤더
  welcomeSection: {
    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    color: colors.white,
  },
  welcomeContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeTitle: {
    ...typography.headingL,
    color: colors.white,
    margin: 0,
  } as React.CSSProperties,
  welcomeMeta: {
    display: 'flex',
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  typeBadgePharmacist: {
    ...typography.bodyS,
    background: 'rgba(255,255,255,0.2)',
    color: colors.white,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.md,
    fontWeight: 600,
  } as React.CSSProperties,
  typeBadgeStudent: {
    ...typography.bodyS,
    background: 'rgba(5,150,105,0.3)',
    color: colors.white,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.md,
    fontWeight: 600,
  } as React.CSSProperties,
  roleBadge: {
    ...typography.bodyS,
    background: 'rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.9)',
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.md,
  } as React.CSSProperties,

  // 카드 컨테이너
  cardContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sectionGap,
    minHeight: '400px',
  },
};
