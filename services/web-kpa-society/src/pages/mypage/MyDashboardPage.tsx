/**
 * MyDashboardPage - 마이페이지 대시보드
 *
 * WO-KPA-MYPAGE-OFFICER-V1
 * - 임원인 경우 임원 대시보드 바로가기 추가
 * - 임원인 경우 회계 요약 섹션 추가
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { AiSummaryButton } from '../../components/ai';
import { mypageApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { UserActivity } from '../../api/mypage';

// 회계 항목 타입 (단식부기)
interface AccountingEntry {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  balance: number;
}

interface DashboardSummary {
  enrolledCourses: number;
  completedCourses: number;
  certificates: number;
  forumPosts: number;
  groupbuyParticipations: number;
}

/**
 * 사용자 표시 이름 헬퍼
 * DB에 기본값 '운영자'가 설정되어 있으므로 name은 항상 존재
 */
function getUserDisplayName(user: any): string {
  if (!user) return '사용자';
  return user.name || '사용자';
}

export function MyDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 임원 여부 확인 (officer 또는 admin)
  const isOfficer = user?.role === 'officer' || user?.role === 'admin';

  // 임원용 회계 데이터 (단식부기) - Mock
  const [accountingEntries] = useState<AccountingEntry[]>([
    { id: '1', date: '2025-01-02', type: 'income', category: '연회비', description: '1월 연회비 수납', amount: 15000000, balance: 85000000 },
    { id: '2', date: '2025-01-03', type: 'expense', category: '인건비', description: '1월 직원 급여', amount: 8000000, balance: 77000000 },
    { id: '3', date: '2025-01-04', type: 'expense', category: '운영비', description: '사무실 관리비', amount: 2000000, balance: 75000000 },
  ]);

  // 회계 요약 계산
  const accountingSummary = {
    totalIncome: accountingEntries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0),
    totalExpense: accountingEntries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0),
    currentBalance: accountingEntries.length > 0 ? accountingEntries[accountingEntries.length - 1].balance : 0,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, activitiesRes] = await Promise.all([
        mypageApi.getDashboardSummary(),
        mypageApi.getActivities({ limit: 5 }),
      ]);

      setSummary(summaryRes.data);
      setActivities(activitiesRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="마이페이지를 이용하려면 로그인해주세요."
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="정보를 불러오는 중..." />;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="오류가 발생했습니다"
          description={error}
          action={{ label: '다시 시도', onClick: loadData }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="마이페이지"
        breadcrumb={[{ label: '홈', href: '/' }, { label: '마이페이지' }]}
      />

      {/* 사용자 프로필 요약 */}
      <Card padding="large" style={{ marginBottom: '24px' }}>
        <div style={styles.profileSection}>
          <div style={styles.avatar}>
            <span>👤</span>
          </div>
          <div style={styles.profileInfo}>
            <h2 style={styles.userName}>{getUserDisplayName(user)}</h2>
            <p style={styles.userEmail}>{user.email}</p>
            <div style={styles.userMeta}>
              {(user as any).organizationId && (
                <span style={styles.orgBadge}>
                  🏢 소속 분회
                </span>
              )}
              <span style={styles.roleBadge}>
                {user.role === 'admin' ? '관리자' : user.role === 'officer' ? '임원' : '회원'}
              </span>
            </div>
          </div>
          <Link to="profile" style={styles.editButton}>
            프로필 수정
          </Link>
        </div>
      </Card>

      {/* 임원 전용 섹션 */}
      {isOfficer && (
        <>
          {/* 임원 대시보드 바로가기 */}
          <Card padding="medium" style={{ marginBottom: '24px' }}>
            <div style={styles.officerSection}>
              <div style={styles.officerInfo}>
                <span style={styles.officerIcon}>🏛️</span>
                <div>
                  <h3 style={styles.officerTitle}>임원 대시보드</h3>
                  <p style={styles.officerDesc}>회계, 일정, 행사 관리 등 임원 업무를 확인하세요.</p>
                </div>
              </div>
              <Link to="/intranet" style={styles.officerButton}>
                대시보드 이동 →
              </Link>
            </div>
          </Card>

          {/* 임원용 회계 요약 */}
          <Card padding="large" style={{ marginBottom: '24px' }}>
            <div style={styles.accountingHeader}>
              <h3 style={styles.sectionTitle}>💰 회계 요약</h3>
              <AiSummaryButton
                label="AI 분석"
                contextLabel="회계 현황"
                size="sm"
                serviceId="kpa-society"
                contextData={{
                  role: user.role,
                  summary: accountingSummary,
                  recentEntries: accountingEntries.slice(0, 3),
                  period: '2025년 1월',
                }}
              />
            </div>
            <div style={styles.accountingSummaryGrid}>
              <div style={styles.accountingSummaryCard}>
                <span style={styles.accountingLabel}>총 수입</span>
                <span style={{ ...styles.accountingValue, color: '#059669' }}>
                  {formatCurrency(accountingSummary.totalIncome)}
                </span>
              </div>
              <div style={styles.accountingSummaryCard}>
                <span style={styles.accountingLabel}>총 지출</span>
                <span style={{ ...styles.accountingValue, color: '#DC2626' }}>
                  {formatCurrency(accountingSummary.totalExpense)}
                </span>
              </div>
              <div style={styles.accountingSummaryCard}>
                <span style={styles.accountingLabel}>현재 잔액</span>
                <span style={{ ...styles.accountingValue, color: colors.primary }}>
                  {formatCurrency(accountingSummary.currentBalance)}
                </span>
              </div>
            </div>
            <Link to="/intranet" style={styles.viewDetailLink}>
              상세 내역 보기 →
            </Link>
          </Card>
        </>
      )}

      {/* 활동 요약 카드 */}
      <div style={styles.summaryGrid}>
        <Link to="/mypage/enrollments" style={styles.summaryLink}>
          <Card padding="medium">
            <div style={styles.summaryItem}>
              <span style={styles.summaryIcon}>📚</span>
              <span style={styles.summaryValue}>{summary?.enrolledCourses || 0}</span>
              <span style={styles.summaryLabel}>수강 중 과정</span>
            </div>
          </Card>
        </Link>
        <Card padding="medium">
          <div style={styles.summaryItem}>
            <span style={styles.summaryIcon}>✅</span>
            <span style={styles.summaryValue}>{summary?.completedCourses || 0}</span>
            <span style={styles.summaryLabel}>수료 완료</span>
          </div>
        </Card>
        <Link to="/mypage/certificates" style={styles.summaryLink}>
          <Card padding="medium">
            <div style={styles.summaryItem}>
              <span style={styles.summaryIcon}>🎓</span>
              <span style={styles.summaryValue}>{summary?.certificates || 0}</span>
              <span style={styles.summaryLabel}>수료증</span>
            </div>
          </Card>
        </Link>
        <Card padding="medium">
          <div style={styles.summaryItem}>
            <span style={styles.summaryIcon}>💬</span>
            <span style={styles.summaryValue}>{summary?.forumPosts || 0}</span>
            <span style={styles.summaryLabel}>작성 글</span>
          </div>
        </Card>
        <Link to="/groupbuy/history" style={styles.summaryLink}>
          <Card padding="medium">
            <div style={styles.summaryItem}>
              <span style={styles.summaryIcon}>🛒</span>
              <span style={styles.summaryValue}>{summary?.groupbuyParticipations || 0}</span>
              <span style={styles.summaryLabel}>공동구매</span>
            </div>
          </Card>
        </Link>
      </div>

      {/* 최근 활동 */}
      <Card padding="large" style={{ marginTop: '24px' }}>
        <h3 style={styles.sectionTitle}>최근 활동</h3>
        {activities.length === 0 ? (
          <p style={styles.noActivity}>최근 활동이 없습니다.</p>
        ) : (
          <div style={styles.activityList}>
            {activities.map((activity, index) => (
              <div key={index} style={styles.activityItem}>
                <span style={styles.activityIcon}>
                  {activity.type === 'course_progress' && '📚'}
                  {activity.type === 'forum_post' && '💬'}
                  {activity.type === 'groupbuy' && '🛒'}
                  {activity.type === 'certificate' && '🎓'}
                </span>
                <div style={styles.activityContent}>
                  <span style={styles.activityTitle}>{activity.title}</span>
                  <span style={styles.activityDesc}>{activity.description}</span>
                </div>
                <span style={styles.activityDate}>
                  {new Date(activity.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 바로가기 */}
      <div style={styles.quickLinks}>
        <Link to="/mypage/profile" style={styles.quickLink}>
          <span style={styles.quickLinkIcon}>👤</span>
          <span>프로필</span>
        </Link>
        <Link to="/mypage/settings" style={styles.quickLink}>
          <span style={styles.quickLinkIcon}>⚙️</span>
          <span>설정</span>
        </Link>
        <Link to="/mypage/certificates" style={styles.quickLink}>
          <span style={styles.quickLinkIcon}>🎓</span>
          <span>수료증</span>
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  profileSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: colors.neutral100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    flexShrink: 0,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    ...typography.headingL,
    color: colors.neutral900,
    margin: 0,
  },
  userEmail: {
    ...typography.bodyM,
    color: colors.neutral500,
    marginTop: '4px',
  },
  userMeta: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
  orgBadge: {
    ...typography.bodyS,
    padding: '4px 10px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '4px',
  },
  roleBadge: {
    ...typography.bodyS,
    padding: '4px 10px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '4px',
  },
  editButton: {
    padding: '10px 20px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
  },
  summaryLink: {
    textDecoration: 'none',
    color: 'inherit',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '8px',
  },
  summaryIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  summaryValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  summaryLabel: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginTop: '4px',
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '16px',
  },
  noActivity: {
    ...typography.bodyM,
    color: colors.neutral500,
    textAlign: 'center',
    padding: '32px',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  activityIcon: {
    fontSize: '20px',
    width: '32px',
    textAlign: 'center',
  },
  activityContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  activityTitle: {
    ...typography.bodyM,
    color: colors.neutral800,
    fontWeight: 500,
  },
  activityDesc: {
    ...typography.bodyS,
    color: colors.neutral500,
  },
  activityDate: {
    ...typography.bodyS,
    color: colors.neutral400,
  },
  quickLinks: {
    display: 'flex',
    gap: '16px',
    marginTop: '24px',
  },
  quickLink: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '12px',
    textDecoration: 'none',
    color: colors.neutral700,
  },
  quickLinkIcon: {
    fontSize: '28px',
    marginBottom: '8px',
  },
  // 임원 섹션 스타일
  officerSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  officerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  officerIcon: {
    fontSize: '40px',
  },
  officerTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
  },
  officerDesc: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginTop: '4px',
  },
  officerButton: {
    padding: '12px 24px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
  },
  // 회계 섹션 스타일
  accountingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  accountingSummaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '16px',
  },
  accountingSummaryCard: {
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    textAlign: 'center',
  },
  accountingLabel: {
    display: 'block',
    ...typography.bodyS,
    color: colors.neutral500,
    marginBottom: '8px',
  },
  accountingValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 700,
  },
  viewDetailLink: {
    display: 'block',
    textAlign: 'center',
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '14px',
    paddingTop: '8px',
  },
};
