/**
 * DashboardPage - 지부 관리자 대시보드
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminHeader } from '../../components/admin';
import { colors } from '../../styles/theme';

interface DashboardStats {
  totalDivisions: number;
  totalMembers: number;
  activeMembers: number;
  pendingAnnualReports: number;
  pendingMembershipFees: number;
  totalFeeAmount: number;
  paidFeeAmount: number;
}

interface RecentActivity {
  id: string;
  type: 'annual_report' | 'membership_fee' | 'member_join' | 'division_report';
  title: string;
  division: string;
  date: string;
  status?: 'pending' | 'approved' | 'rejected';
}

interface DivisionSummary {
  id: string;
  name: string;
  memberCount: number;
  feeRate: number;
  reportRate: number;
}

export function DashboardPage() {
  // 샘플 통계 데이터
  const [stats] = useState<DashboardStats>({
    totalDivisions: 5,
    totalMembers: 125,
    activeMembers: 118,
    pendingAnnualReports: 8,
    pendingMembershipFees: 12,
    totalFeeAmount: 25000000,
    paidFeeAmount: 21500000,
  });

  // 샘플 활동 데이터
  const [recentActivities] = useState<RecentActivity[]>([
    { id: '1', type: 'annual_report', title: '홍길동 - 신상신고서 제출', division: '샘플분회', date: '2025-01-04', status: 'pending' },
    { id: '2', type: 'membership_fee', title: '김테스트 - 연회비 납부', division: '샘플분회', date: '2025-01-03', status: 'pending' },
    { id: '3', type: 'member_join', title: '박신입 - 신규 회원 가입', division: '테스트분회', date: '2025-01-03', status: 'pending' },
  ]);

  // 분회 요약 데이터
  const [divisionSummaries] = useState<DivisionSummary[]>([
    { id: '1', name: '샘플분회', memberCount: 25, feeRate: 88, reportRate: 92 },
    { id: '2', name: '테스트분회', memberCount: 20, feeRate: 75, reportRate: 85 },
    { id: '3', name: '데모분회', memberCount: 30, feeRate: 90, reportRate: 95 },
  ]);

  const feeRate = Math.round((stats.paidFeeAmount / stats.totalFeeAmount) * 100);

  const statCards = [
    { label: '소속 분회', value: stats.totalDivisions, icon: '🏢', color: colors.primary, link: '/admin/divisions' },
    { label: '전체 회원', value: stats.totalMembers, icon: '👥', color: colors.accentGreen, link: '/admin/members' },
    { label: '신상신고 대기', value: stats.pendingAnnualReports, icon: '📝', color: colors.accentYellow, link: '/admin/annual-report' },
    { label: '연회비 미납', value: stats.pendingMembershipFees, icon: '💰', color: colors.accentRed, link: '/admin/membership-fee' },
  ];

  const quickActions = [
    { label: '분회 관리', icon: '🏢', path: '/admin/divisions', description: '분회별 현황 조회' },
    { label: '신상신고 처리', icon: '📝', path: '/admin/annual-report', description: '제출된 신고서 검토' },
    { label: '연회비 관리', icon: '💰', path: '/admin/membership-fee', description: '납부 현황 확인' },
    { label: '공지사항 작성', icon: '📢', path: '/admin/news', description: '지부 공지 등록' },
    { label: '임원 관리', icon: '👔', path: '/admin/officers', description: '지부 임원 정보 관리' },
    { label: '지부 설정', icon: '⚙️', path: '/admin/settings', description: '기본 정보 설정' },
  ];

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'annual_report': return '📝';
      case 'membership_fee': return '💰';
      case 'member_join': return '👤';
      case 'division_report': return '📊';
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  return (
    <div>
      <AdminHeader
        title="지부 대시보드"
        subtitle="서울특별시약사회 운영 현황"
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

        {/* 연회비 현황 바 */}
        <div style={styles.feeCard}>
          <div style={styles.feeHeader}>
            <div style={styles.feeTitle}>2025년 연회비 현황</div>
            <div style={styles.feeRate}>{feeRate}% 납부</div>
          </div>
          <div style={styles.feeBar}>
            <div style={{ ...styles.feeBarFill, width: `${feeRate}%` }} />
          </div>
          <div style={styles.feeDetails}>
            <span>납부: {formatCurrency(stats.paidFeeAmount)}</span>
            <span>미납: {formatCurrency(stats.totalFeeAmount - stats.paidFeeAmount)}</span>
          </div>
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
                    <div style={styles.activityMeta}>
                      <span style={styles.activityDivision}>{activity.division}</span>
                      <span style={styles.activityDate}>{activity.date}</span>
                    </div>
                  </div>
                  {getStatusBadge(activity.status)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 분회별 현황 */}
        <div style={styles.divisionSection}>
          <div style={styles.divisionHeader}>
            <h2 style={styles.sectionTitle}>분회별 현황</h2>
            <Link to="/admin/divisions" style={styles.viewAllLink}>
              전체 보기 →
            </Link>
          </div>
          <div style={styles.divisionGrid}>
            {divisionSummaries.map((division) => (
              <Link
                key={division.id}
                to={`/admin/divisions/${division.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={styles.divisionCard}>
                  <div style={styles.divisionName}>{division.name}</div>
                  <div style={styles.divisionStats}>
                    <div style={styles.divisionStat}>
                      <span style={styles.divisionStatValue}>{division.memberCount}명</span>
                      <span style={styles.divisionStatLabel}>회원</span>
                    </div>
                    <div style={styles.divisionStat}>
                      <span style={styles.divisionStatValue}>{division.feeRate}%</span>
                      <span style={styles.divisionStatLabel}>납부율</span>
                    </div>
                    <div style={styles.divisionStat}>
                      <span style={styles.divisionStatValue}>{division.reportRate}%</span>
                      <span style={styles.divisionStatLabel}>신고율</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
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
    marginBottom: '24px',
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
  feeCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  feeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  feeTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  feeRate: {
    fontSize: '20px',
    fontWeight: 700,
    color: colors.accentGreen,
  },
  feeBar: {
    height: '12px',
    backgroundColor: colors.neutral200,
    borderRadius: '6px',
    overflow: 'hidden',
  },
  feeBarFill: {
    height: '100%',
    backgroundColor: colors.accentGreen,
    borderRadius: '6px',
    transition: 'width 0.5s',
  },
  feeDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '12px',
    fontSize: '14px',
    color: colors.neutral600,
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px',
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
  activityMeta: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  activityDivision: {
    fontSize: '12px',
    color: colors.primary,
    fontWeight: 500,
  },
  activityDate: {
    fontSize: '12px',
    color: colors.neutral500,
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  divisionSection: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  divisionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  viewAllLink: {
    fontSize: '14px',
    color: colors.primary,
    textDecoration: 'none',
  },
  divisionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  divisionCard: {
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '10px',
    transition: 'background-color 0.2s',
  },
  divisionName: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '16px',
  },
  divisionStats: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  divisionStat: {
    textAlign: 'center',
  },
  divisionStatValue: {
    display: 'block',
    fontSize: '18px',
    fontWeight: 700,
    color: colors.primary,
  },
  divisionStatLabel: {
    fontSize: '12px',
    color: colors.neutral500,
    marginTop: '4px',
  },
};
