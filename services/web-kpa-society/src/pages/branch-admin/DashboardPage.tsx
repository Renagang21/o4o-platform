/**
 * DashboardPage - 분회 관리자 대시보드
 *
 * WO-KPA-OPERATOR-DASHBOARD-IMPROVEMENT-V1
 * - Mock 데이터 제거, 실제 API 연결
 * - "요약 → 이동" 패턴
 */

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminHeader } from '../../components/branch-admin';
import { colors } from '../../styles/theme';
import { branchAdminApi, type BranchDashboardStats, type RecentActivity } from '../../api/branchAdmin';

export function DashboardPage() {
  const { branchId } = useParams();

  // 실제 API 연결 상태
  const [stats, setStats] = useState<BranchDashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    pendingAnnualReports: 0,
    pendingMembershipFees: 0,
    recentPosts: 0,
    upcomingEvents: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API 데이터 로드
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 병렬로 통계와 활동 데이터 로드
        const [statsRes, activitiesRes] = await Promise.all([
          branchAdminApi.getDashboardStats().catch(() => null),
          branchAdminApi.getRecentActivities(5).catch(() => null),
        ]);

        // 통계 데이터 설정
        if (statsRes?.data) {
          setStats(statsRes.data);
        }

        // 활동 데이터 설정
        if (activitiesRes?.data) {
          setRecentActivities(activitiesRes.data);
        }
      } catch (err) {
        console.error('Dashboard data load error:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [branchId]);

  const basePath = `/branch/${branchId}/admin`;

  const statCards = [
    { label: '전체 회원', value: stats.totalMembers, icon: '👥', color: colors.primary, link: `${basePath}/members` },
    { label: '활성 회원', value: stats.activeMembers, icon: '✅', color: colors.accentGreen, link: `${basePath}/members` },
    { label: '신상신고 대기', value: stats.pendingAnnualReports, icon: '📝', color: colors.accentYellow, link: `${basePath}/annual-report` },
    { label: '연회비 대기', value: stats.pendingMembershipFees, icon: '💰', color: colors.accentRed, link: `${basePath}/membership-fee` },
  ];

  const quickActions = [
    { label: '회원 관리', icon: '👥', path: `${basePath}/members`, description: '회원 목록 조회 및 관리' },
    { label: '신상신고 처리', icon: '📝', path: `${basePath}/annual-report`, description: '제출된 신상신고서 검토' },
    { label: '연회비 관리', icon: '💰', path: `${basePath}/membership-fee`, description: '연회비 납부 현황 확인' },
    { label: '공지사항 작성', icon: '📢', path: `${basePath}/news/new`, description: '새 공지사항 등록' },
    { label: '임원 관리', icon: '👔', path: `${basePath}/officers`, description: '임원 정보 관리' },
    { label: '분회 설정', icon: '⚙️', path: `${basePath}/settings`, description: '분회 기본 정보 설정' },
  ];

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'annual_report': return '📝';
      case 'membership_fee': return '💰';
      case 'member_join': return '👤';
      case 'post': return '📢';
      default: return '📌';
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const statusStyles: Record<string, React.CSSProperties> = {
      pending: { backgroundColor: colors.accentYellow, color: colors.white },
      completed: { backgroundColor: colors.accentGreen, color: colors.white },
      approved: { backgroundColor: colors.accentGreen, color: colors.white },
      rejected: { backgroundColor: colors.accentRed, color: colors.white },
    };
    const statusLabels: Record<string, string> = {
      pending: '대기중',
      completed: '완료',
      approved: '승인',
      rejected: '반려',
    };
    return (
      <span style={{ ...styles.statusBadge, ...(statusStyles[status] || {}) }}>
        {statusLabels[status] || status}
      </span>
    );
  };

  return (
    <div>
      <AdminHeader
        title="대시보드"
        subtitle="분회 운영 현황을 한눈에 확인하세요"
      />

      <div style={styles.content}>
        {/* 로딩 상태 */}
        {loading && (
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingText}>데이터를 불러오는 중...</div>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div style={styles.errorBanner}>
            {error}
          </div>
        )}

        {/* 통계 카드 */}
        <div style={styles.statsGrid}>
          {statCards.map((stat) => (
            <Link key={stat.label} to={stat.link} style={{ textDecoration: 'none' }}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>{stat.icon}</div>
                <div style={styles.statInfo}>
                  <div style={styles.statValue}>{loading ? '-' : stat.value}</div>
                  <div style={styles.statLabel}>{stat.label}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div style={styles.mainGrid}>
          {/* 빠른 작업 */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>빠른 작업</h2>
            <div style={styles.quickActionsGrid}>
              {quickActions.map((action) => (
                <Link key={action.path} to={action.path} style={{ textDecoration: 'none' }}>
                  <div style={styles.quickActionCard}>
                    <span style={styles.quickActionIcon}>{action.icon}</span>
                    <div style={styles.quickActionInfo}>
                      <div style={styles.quickActionLabel}>{action.label}</div>
                      <div style={styles.quickActionDesc}>{action.description}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 최근 활동 */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>최근 활동</h2>
            <div style={styles.activityList}>
              {loading ? (
                <div style={styles.emptyState}>불러오는 중...</div>
              ) : recentActivities.length === 0 ? (
                <div style={styles.emptyState}>최근 활동이 없습니다.</div>
              ) : (
                recentActivities.map((activity) => (
                  <div key={activity.id} style={styles.activityItem}>
                    <span style={styles.activityIcon}>{getActivityIcon(activity.type)}</span>
                    <div style={styles.activityInfo}>
                      <div style={styles.activityTitle}>{activity.title}</div>
                      <div style={styles.activityDate}>{activity.date}</div>
                    </div>
                    {getStatusBadge(activity.status)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '24px',
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  statIcon: {
    fontSize: '32px',
  },
  statInfo: {},
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  statLabel: {
    fontSize: '14px',
    color: colors.neutral500,
    marginTop: '4px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 20px 0',
  },
  quickActionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  quickActionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    transition: 'background-color 0.2s',
  },
  quickActionIcon: {
    fontSize: '24px',
  },
  quickActionInfo: {},
  quickActionLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral800,
  },
  quickActionDesc: {
    fontSize: '12px',
    color: colors.neutral500,
    marginTop: '2px',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  activityIcon: {
    fontSize: '20px',
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral800,
  },
  activityDate: {
    fontSize: '12px',
    color: colors.neutral500,
    marginTop: '2px',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  loadingOverlay: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    marginBottom: '20px',
  },
  loadingText: {
    fontSize: '14px',
    color: colors.neutral500,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '24px',
    color: colors.neutral500,
    fontSize: '14px',
  },
};
