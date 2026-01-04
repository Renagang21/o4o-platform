/**
 * DashboardPage - 분회 관리자 대시보드
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminHeader } from '../../components/branch-admin';
import { colors } from '../../styles/theme';

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  pendingAnnualReports: number;
  pendingMembershipFees: number;
  recentPosts: number;
  upcomingEvents: number;
}

interface RecentActivity {
  id: string;
  type: 'annual_report' | 'membership_fee' | 'member_join' | 'post';
  title: string;
  date: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export function DashboardPage() {
  const { branchId } = useParams();
  // 샘플 통계 데이터 (테스트용 최소 데이터)
  const [stats] = useState<DashboardStats>({
    totalMembers: 25,
    activeMembers: 23,
    pendingAnnualReports: 1,
    pendingMembershipFees: 2,
    recentPosts: 3,
    upcomingEvents: 1,
  });

  // 샘플 활동 데이터 (테스트용)
  const [recentActivities] = useState<RecentActivity[]>([
    { id: '1', type: 'annual_report', title: '홍길동 - 2025년 신상신고서 제출', date: '2025-01-04', status: 'pending' },
    { id: '2', type: 'membership_fee', title: '김테스트 - 2025년 연회비 납부', date: '2025-01-03', status: 'pending' },
  ]);

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
      approved: { backgroundColor: colors.accentGreen, color: colors.white },
      rejected: { backgroundColor: colors.accentRed, color: colors.white },
    };
    const statusLabels: Record<string, string> = {
      pending: '대기중',
      approved: '승인',
      rejected: '반려',
    };
    return (
      <span style={{ ...styles.statusBadge, ...statusStyles[status] }}>
        {statusLabels[status]}
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
        {/* 통계 카드 */}
        <div style={styles.statsGrid}>
          {statCards.map((stat) => (
            <Link key={stat.label} to={stat.link} style={{ textDecoration: 'none' }}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>{stat.icon}</div>
                <div style={styles.statInfo}>
                  <div style={styles.statValue}>{stat.value}</div>
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
              {recentActivities.map((activity) => (
                <div key={activity.id} style={styles.activityItem}>
                  <span style={styles.activityIcon}>{getActivityIcon(activity.type)}</span>
                  <div style={styles.activityInfo}>
                    <div style={styles.activityTitle}>{activity.title}</div>
                    <div style={styles.activityDate}>{activity.date}</div>
                  </div>
                  {getStatusBadge(activity.status)}
                </div>
              ))}
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
};
