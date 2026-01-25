/**
 * MyDashboardPage - 마이페이지 대시보드
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { mypageApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { UserActivity } from '../../api/mypage';

interface DashboardSummary {
  enrolledCourses: number;
  completedCourses: number;
  certificates: number;
  forumPosts: number;
  groupbuyParticipations: number;
}

export function MyDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            <h2 style={styles.userName}>{user.name}</h2>
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
};
