/**
 * UserDashboardPage - 사용자 대시보드
 *
 * Phase 4: WO-KPA-SOCIETY-PHASE4-DASHBOARD-IMPLEMENTATION-V1
 *
 * 구조:
 * - Welcome 헤더 (사용자 이름 + 회원 유형)
 * - 탭 바: 커뮤니티 (항상) + 약국경영 (pharmacy_owner만)
 * - 탭 콘텐츠 영역
 *
 * 라우트: /dashboard
 */

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, ACTIVITY_TYPE_LABELS } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { CommunityDashboardTab } from './CommunityDashboardTab';
import { PharmacyDashboardTab } from './PharmacyDashboardTab';
// ActivityTypePrompt removed — WO-KPA-A-AUTH-UX-STATE-UNIFICATION-V1
// AuthGate → /setup-activity 페이지로 대체

type TabKey = 'community' | 'pharmacy';

export function UserDashboardPage() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('community');

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

  const isPharmacyOwner = user.isStoreOwner === true;
  const isStudent = user.membershipType === 'student';
  const roleLabel = user.activityType ? ACTIVITY_TYPE_LABELS[user.activityType] : null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'community', label: '커뮤니티' },
    ...(isPharmacyOwner ? [{ key: 'pharmacy' as TabKey, label: '약국경영' }] : []),
  ];

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

      {/* 탭 바 */}
      <nav style={styles.tabBar}>
        <div style={styles.tabList}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.key ? styles.tabButtonActive : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* 탭 콘텐츠 */}
      <main style={styles.tabContent}>
        {activeTab === 'community' && <CommunityDashboardTab user={user} />}
        {activeTab === 'pharmacy' && isPharmacyOwner && <PharmacyDashboardTab />}
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

  // 탭 바
  tabBar: {
    borderBottom: `1px solid ${colors.neutral200}`,
    marginBottom: spacing.xl,
  },
  tabList: {
    display: 'flex',
    gap: spacing.xs,
  },
  tabButton: {
    ...typography.bodyL,
    padding: `${spacing.md} ${spacing.lg}`,
    border: 'none',
    borderBottom: '3px solid transparent',
    background: 'none',
    color: colors.neutral500,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'color 0.2s, border-color 0.2s',
  } as React.CSSProperties,
  tabButtonActive: {
    color: colors.primary,
    borderBottomColor: colors.primary,
    fontWeight: 600,
  },

  // 탭 콘텐츠
  tabContent: {
    minHeight: '400px',
  },
};
