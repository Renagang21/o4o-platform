/**
 * OperatorDashboardPage - 지부/분회 운영자 종합 대시보드
 *
 * WO-KPA-OPERATOR-DASHBOARD-COMPREHENSIVE-V1
 * 운영에 관련된 전체를 보여주는 종합 대시보드:
 * - 회원 관리
 * - 임원 관리
 * - 행사 관리
 * - 신상신고 관리
 * - 연수교육 관리
 * - 약사 연수교육 점수 관리
 * - 재정 관리
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IntranetHeader } from '../../components/intranet';
import { AiSummaryButton } from '../../components/ai';
import { useOrganization } from '../../contexts/OrganizationContext';
import { colors } from '../../styles/theme';

// 통계 타입 정의
interface DashboardStats {
  // 회원 관리
  members: {
    total: number;
    active: number;
    inactive: number;
    pendingApproval: number;
  };
  // 임원 관리
  officers: {
    total: number;
    president: number;
    vicePresidents: number;
    committeeChairs: number;
    advisors: number;
  };
  // 행사 관리
  events: {
    total: number;
    upcoming: number;
    inProgress: number;
    completed: number;
  };
  // 신상신고
  personalReports: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  // 연수교육
  training: {
    totalCourses: number;
    activeCourses: number;
    totalEnrollments: number;
    completionRate: number;
  };
  // 연수교육 점수
  trainingScores: {
    avgScore: number;
    needsAttention: number;
    completed: number;
    inProgress: number;
  };
  // 재정
  finance: {
    currentBalance: number;
    monthlyIncome: number;
    monthlyExpense: number;
    pendingFees: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'member' | 'officer' | 'event' | 'report' | 'training' | 'finance';
  title: string;
  description: string;
  date: string;
  status?: 'pending' | 'completed' | 'approved' | 'rejected';
}

export function OperatorDashboardPage() {
  const { currentOrganization } = useOrganization();
  const orgType = currentOrganization?.type === 'branch' ? 'branch' : 'district';

  // WO-KPA-OPERATOR-DASHBOARD-LINK-FIX-V1: 분회 서비스 경로 마이그레이션
  // WO-KPA-BRANCH-SERVICE-ROUTE-MIGRATION-V1: /branch-services/:branchId/*
  const adminBasePath = orgType === 'branch'
    ? `/branch-services/${currentOrganization?.id}/admin`
    : '/demo/admin';
  const intranetBasePath = '/demo/intranet';
  const demoBasePath = '/demo';

  // 대시보드 통계 데이터
  const [stats, setStats] = useState<DashboardStats>({
    members: { total: 0, active: 0, inactive: 0, pendingApproval: 0 },
    officers: { total: 0, president: 0, vicePresidents: 0, committeeChairs: 0, advisors: 0 },
    events: { total: 0, upcoming: 0, inProgress: 0, completed: 0 },
    personalReports: { total: 0, pending: 0, approved: 0, rejected: 0 },
    training: { totalCourses: 0, activeCourses: 0, totalEnrollments: 0, completionRate: 0 },
    trainingScores: { avgScore: 0, needsAttention: 0, completed: 0, inProgress: 0 },
    finance: { currentBalance: 0, monthlyIncome: 0, monthlyExpense: 0, pendingFees: 0 },
  });

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // 데이터 로드
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // TODO: API 연동 - 현재는 샘플 데이터
        await new Promise(resolve => setTimeout(resolve, 500));

        setStats({
          members: {
            total: 245,
            active: 230,
            inactive: 10,
            pendingApproval: 5,
          },
          officers: {
            total: 15,
            president: 1,
            vicePresidents: 3,
            committeeChairs: 8,
            advisors: 3,
          },
          events: {
            total: 12,
            upcoming: 4,
            inProgress: 2,
            completed: 6,
          },
          personalReports: {
            total: 245,
            pending: 23,
            approved: 210,
            rejected: 12,
          },
          training: {
            totalCourses: 8,
            activeCourses: 5,
            totalEnrollments: 450,
            completionRate: 72,
          },
          trainingScores: {
            avgScore: 85.3,
            needsAttention: 18,
            completed: 180,
            inProgress: 65,
          },
          finance: {
            currentBalance: 75000000,
            monthlyIncome: 15000000,
            monthlyExpense: 12000000,
            pendingFees: 3500000,
          },
        });

        setRecentActivities([
          { id: '1', type: 'member', title: '신규 회원 가입', description: '박신입 약사 가입 승인 대기', date: '2025-01-10', status: 'pending' },
          { id: '2', type: 'report', title: '신상신고서 제출', description: '홍길동 - 주소 변경', date: '2025-01-10', status: 'pending' },
          { id: '3', type: 'event', title: '정기 이사회', description: '1월 정기 이사회 예정', date: '2025-01-15' },
          { id: '4', type: 'training', title: '보수교육 완료', description: '12명 이수 완료', date: '2025-01-09', status: 'completed' },
          { id: '5', type: 'finance', title: '연회비 수납', description: '1월분 연회비 ₩2,500,000 수납', date: '2025-01-08', status: 'completed' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [currentOrganization?.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'member': return '👤';
      case 'officer': return '👔';
      case 'event': return '📅';
      case 'report': return '📝';
      case 'training': return '🎓';
      case 'finance': return '💰';
      default: return '📌';
    }
  };

  const getStatusBadge = (status?: RecentActivity['status']) => {
    if (!status) return null;
    const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: '#FEF3C7', color: '#D97706', label: '대기' },
      completed: { bg: '#D1FAE5', color: '#059669', label: '완료' },
      approved: { bg: '#D1FAE5', color: '#059669', label: '승인' },
      rejected: { bg: '#FEE2E2', color: '#DC2626', label: '반려' },
    };
    const config = statusConfig[status];
    return (
      <span style={{ ...styles.statusBadge, backgroundColor: config.bg, color: config.color }}>
        {config.label}
      </span>
    );
  };

  // 관리 섹션 정의 - WO-KPA-OPERATOR-DASHBOARD-LINK-FIX-V1
  // 각 링크를 실제 존재하는 라우트로 매핑
  const managementSections = [
    {
      id: 'members',
      title: '👥 회원 관리',
      description: '회원 목록, 승인, 상태 관리',
      link: `${adminBasePath}/members`,
      stats: [
        { label: '전체 회원', value: stats.members.total, color: colors.primary },
        { label: '활성', value: stats.members.active, color: '#059669' },
        { label: '승인 대기', value: stats.members.pendingApproval, color: '#D97706' },
      ],
      alert: stats.members.pendingApproval > 0 ? `${stats.members.pendingApproval}건 승인 대기` : undefined,
    },
    {
      id: 'officers',
      title: '👔 임원 관리',
      description: '임원 현황, 조직도 관리',
      link: `${adminBasePath}/officers`,
      stats: [
        { label: '총 임원', value: stats.officers.total, color: colors.primary },
        { label: '회장/부회장', value: stats.officers.president + stats.officers.vicePresidents, color: '#4F46E5' },
        { label: '위원장', value: stats.officers.committeeChairs, color: '#059669' },
      ],
    },
    {
      id: 'events',
      title: '🎪 행사 관리',
      description: '행사 기획, 일정, 참여 관리',
      link: `${intranetBasePath}/schedule`,
      stats: [
        { label: '예정 행사', value: stats.events.upcoming, color: '#4F46E5' },
        { label: '진행중', value: stats.events.inProgress, color: '#D97706' },
        { label: '완료', value: stats.events.completed, color: '#059669' },
      ],
      alert: stats.events.upcoming > 0 ? `${stats.events.upcoming}건 예정` : undefined,
    },
    {
      id: 'reports',
      title: '📝 신상신고 관리',
      description: '신상신고서 접수, 검토, 승인',
      link: `${adminBasePath}/annual-report`,
      stats: [
        { label: '전체 신고', value: stats.personalReports.total, color: colors.primary },
        { label: '검토 대기', value: stats.personalReports.pending, color: '#D97706' },
        { label: '승인 완료', value: stats.personalReports.approved, color: '#059669' },
      ],
      alert: stats.personalReports.pending > 0 ? `${stats.personalReports.pending}건 검토 대기` : undefined,
    },
    {
      id: 'training',
      title: '🎓 연수교육 관리',
      description: '교육 과정, 일정, 등록 관리',
      link: `${demoBasePath}/lms`,
      stats: [
        { label: '진행중 과정', value: stats.training.activeCourses, color: colors.primary },
        { label: '총 등록', value: stats.training.totalEnrollments, color: '#4F46E5' },
        { label: '이수율', value: `${stats.training.completionRate}%`, color: '#059669' },
      ],
    },
    {
      id: 'scores',
      title: '📊 교육 점수 관리',
      description: '약사 연수교육 점수 현황',
      link: `${demoBasePath}/lms/certificate`,
      stats: [
        { label: '평균 점수', value: stats.trainingScores.avgScore, color: colors.primary },
        { label: '이수 완료', value: stats.trainingScores.completed, color: '#059669' },
        { label: '관리 필요', value: stats.trainingScores.needsAttention, color: '#DC2626' },
      ],
      alert: stats.trainingScores.needsAttention > 0 ? `${stats.trainingScores.needsAttention}명 관리 필요` : undefined,
    },
    {
      id: 'finance',
      title: '💰 재정 관리',
      description: '회계, 연회비, 예산 관리',
      link: orgType === 'branch' ? `${adminBasePath}/membership-fee` : `${adminBasePath}/fee`,
      stats: [
        { label: '현재 잔액', value: formatCurrency(stats.finance.currentBalance), color: colors.primary },
        { label: '월 수입', value: formatCurrency(stats.finance.monthlyIncome), color: '#059669' },
        { label: '미납 연회비', value: formatCurrency(stats.finance.pendingFees), color: '#D97706' },
      ],
      alert: stats.finance.pendingFees > 0 ? '미납 연회비 있음' : undefined,
    },
  ];

  return (
    <div>
      <div style={styles.headerRow}>
        <IntranetHeader
          title="운영자 대시보드"
          subtitle={`${currentOrganization?.name || (orgType === 'district' ? '지부' : '분회')} 운영 현황`}
        />
        <AiSummaryButton
          contextLabel="운영 현황 종합"
          serviceId="kpa-society"
          contextData={{
            role: 'operator',
            organizationType: orgType,
            stats,
            recentActivities: recentActivities.slice(0, 5),
          }}
        />
      </div>

      <div style={styles.content}>
        {loading && (
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingText}>데이터를 불러오는 중...</div>
          </div>
        )}

        {/* 주요 알림 배너 */}
        {!loading && (managementSections.filter(s => s.alert).length > 0) && (
          <div style={styles.alertBanner}>
            <span style={styles.alertIcon}>⚠️</span>
            <div style={styles.alertContent}>
              <strong>처리가 필요한 항목이 있습니다</strong>
              <div style={styles.alertItems}>
                {managementSections.filter(s => s.alert).map(s => (
                  <Link key={s.id} to={s.link} style={styles.alertItem}>
                    {s.title.split(' ')[0]} {s.alert}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 관리 섹션 그리드 */}
        <div style={styles.sectionsGrid}>
          {managementSections.map((section) => (
            <div key={section.id} style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>{section.title}</h3>
                {section.alert && <span style={styles.sectionAlert}>!</span>}
              </div>
              <p style={styles.sectionDesc}>{section.description}</p>

              <div style={styles.sectionStats}>
                {section.stats.map((stat, idx) => (
                  <div key={idx} style={styles.statItem}>
                    <span style={{ ...styles.statValue, color: typeof stat.color === 'string' ? stat.color : colors.primary }}>
                      {stat.value}
                    </span>
                    <span style={styles.statLabel}>{stat.label}</span>
                  </div>
                ))}
              </div>

              <Link to={section.link} style={styles.sectionLink}>
                관리하기 →
              </Link>
            </div>
          ))}
        </div>

        {/* 빠른 작업 + 최근 활동 */}
        <div style={styles.bottomGrid}>
          {/* 빠른 작업 - WO-KPA-OPERATOR-DASHBOARD-LINK-FIX-V1 */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>⚡ 빠른 작업</h3>
            <div style={styles.quickActions}>
              <Link to={`${adminBasePath}/members`} style={styles.quickAction}>
                <span style={styles.quickActionIcon}>➕</span>
                <span>회원 관리</span>
              </Link>
              <Link to={`${adminBasePath}/annual-report`} style={styles.quickAction}>
                <span style={styles.quickActionIcon}>📝</span>
                <span>신상신고 검토</span>
              </Link>
              <Link to={`${intranetBasePath}/schedule`} style={styles.quickAction}>
                <span style={styles.quickActionIcon}>📅</span>
                <span>일정 관리</span>
              </Link>
              <Link to={`${intranetBasePath}/notice/write`} style={styles.quickAction}>
                <span style={styles.quickActionIcon}>📢</span>
                <span>공지 작성</span>
              </Link>
              <Link to={orgType === 'branch' ? `${adminBasePath}/membership-fee` : `${adminBasePath}/fee`} style={styles.quickAction}>
                <span style={styles.quickActionIcon}>💰</span>
                <span>연회비 관리</span>
              </Link>
              <Link to={`${adminBasePath}/settings`} style={styles.quickAction}>
                <span style={styles.quickActionIcon}>⚙️</span>
                <span>설정</span>
              </Link>
            </div>
          </div>

          {/* 최근 활동 */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📋 최근 활동</h3>
            <div style={styles.activityList}>
              {recentActivities.map((activity) => (
                <div key={activity.id} style={styles.activityItem}>
                  <span style={styles.activityIcon}>{getActivityIcon(activity.type)}</span>
                  <div style={styles.activityInfo}>
                    <div style={styles.activityTitle}>{activity.title}</div>
                    <div style={styles.activityDesc}>{activity.description}</div>
                  </div>
                  <div style={styles.activityMeta}>
                    {getStatusBadge(activity.status)}
                    <span style={styles.activityDate}>{activity.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 재정 요약 - WO-KPA-OPERATOR-DASHBOARD-LINK-FIX-V1 */}
        <div style={styles.financeSection}>
          <div style={styles.financeHeader}>
            <h3 style={styles.cardTitle}>💰 재정 요약</h3>
            <Link to={orgType === 'branch' ? `${adminBasePath}/membership-fee` : `${adminBasePath}/fee`} style={styles.viewAllLink}>
              상세 보기 →
            </Link>
          </div>
          <div style={styles.financeGrid}>
            <div style={styles.financeCard}>
              <div style={styles.financeLabel}>현재 잔액</div>
              <div style={{ ...styles.financeValue, color: colors.primary }}>
                {formatCurrency(stats.finance.currentBalance)}
              </div>
            </div>
            <div style={styles.financeCard}>
              <div style={styles.financeLabel}>이달 수입</div>
              <div style={{ ...styles.financeValue, color: '#059669' }}>
                +{formatCurrency(stats.finance.monthlyIncome)}
              </div>
            </div>
            <div style={styles.financeCard}>
              <div style={styles.financeLabel}>이달 지출</div>
              <div style={{ ...styles.financeValue, color: '#DC2626' }}>
                -{formatCurrency(stats.finance.monthlyExpense)}
              </div>
            </div>
            <div style={styles.financeCard}>
              <div style={styles.financeLabel}>미납 연회비</div>
              <div style={{ ...styles.financeValue, color: '#D97706' }}>
                {formatCurrency(stats.finance.pendingFees)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 32px',
  },
  content: {
    padding: '24px 32px',
  },
  loadingOverlay: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
  },
  loadingText: {
    fontSize: '14px',
    color: colors.neutral500,
  },
  // 알림 배너
  alertBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '16px 20px',
    backgroundColor: '#FEF3C7',
    border: '1px solid #FCD34D',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  alertIcon: {
    fontSize: '24px',
  },
  alertContent: {
    flex: 1,
  },
  alertItems: {
    display: 'flex',
    gap: '16px',
    marginTop: '8px',
    flexWrap: 'wrap',
  },
  alertItem: {
    fontSize: '13px',
    color: '#92400E',
    textDecoration: 'none',
    padding: '4px 8px',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: '4px',
  },
  // 관리 섹션 그리드
  sectionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  sectionAlert: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#DC2626',
    color: colors.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
  },
  sectionDesc: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '0 0 16px 0',
  },
  sectionStats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '16px',
    flex: 1,
  },
  statItem: {
    textAlign: 'center',
  },
  statValue: {
    display: 'block',
    fontSize: '18px',
    fontWeight: 700,
  },
  statLabel: {
    fontSize: '11px',
    color: colors.neutral500,
    marginTop: '2px',
  },
  sectionLink: {
    display: 'block',
    textAlign: 'center',
    padding: '10px',
    backgroundColor: colors.neutral50,
    color: colors.primary,
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  // 하단 그리드
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 16px 0',
  },
  // 빠른 작업
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  quickAction: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 12px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    textDecoration: 'none',
    color: colors.neutral700,
    fontSize: '13px',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
  quickActionIcon: {
    fontSize: '24px',
  },
  // 최근 활동
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  activityIcon: {
    fontSize: '20px',
    marginTop: '2px',
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral800,
  },
  activityDesc: {
    fontSize: '12px',
    color: colors.neutral500,
    marginTop: '2px',
  },
  activityMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },
  activityDate: {
    fontSize: '11px',
    color: colors.neutral400,
  },
  statusBadge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  // 재정 섹션
  financeSection: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  financeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  viewAllLink: {
    fontSize: '13px',
    color: colors.primary,
    textDecoration: 'none',
  },
  financeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  financeCard: {
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '10px',
    textAlign: 'center',
  },
  financeLabel: {
    fontSize: '13px',
    color: colors.neutral500,
    marginBottom: '8px',
  },
  financeValue: {
    fontSize: '20px',
    fontWeight: 700,
  },
};

export default OperatorDashboardPage;
