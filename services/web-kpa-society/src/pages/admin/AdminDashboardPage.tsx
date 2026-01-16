/**
 * AdminDashboardPage - 지부 관리자 대시보드
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, LoadingSpinner, Card } from '../../components/common';
import { AiSummaryButton } from '../../components/ai';
import { useAuth } from '../../contexts';
import { adminApi } from '../../api/admin';
import { colors } from '../../styles/theme';

interface DashboardStats {
  totalBranches: number;
  totalMembers: number;
  pendingApprovals: number;
  activeGroupbuys: number;
  recentPosts: number;
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getDashboardStats();
      setStats(res.data);
    } catch (err) {
      // WO-KPA-SOCIETY-DASHBOARD-P1-A: Empty state on API failure (no mock data)
      console.error('Failed to load dashboard stats:', err);
      setStats({
        totalBranches: 0,
        totalMembers: 0,
        pendingApprovals: 0,
        activeGroupbuys: 0,  // Entity 없음 - 항상 0
        recentPosts: 0,      // Entity 없음 - 항상 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="대시보드를 불러오는 중..." />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <PageHeader
          title="지부 관리자"
          description={`${user?.name || '관리자'}님, 환영합니다.`}
          breadcrumb={[
            { label: '홈', href: '/' },
            { label: '관리자' },
          ]}
        />
        <AiSummaryButton contextLabel="지부 관리 현황" serviceId="kpa-society" />
      </div>

      {/* 통계 카드 */}
      <div style={styles.statsGrid}>
        <Card>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🏢</div>
            <div style={styles.statContent}>
              <div style={styles.statValue}>{stats?.totalBranches || 0}</div>
              <div style={styles.statLabel}>등록된 분회</div>
            </div>
          </div>
        </Card>
        <Card>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👥</div>
            <div style={styles.statContent}>
              <div style={styles.statValue}>{stats?.totalMembers?.toLocaleString() || 0}</div>
              <div style={styles.statLabel}>전체 회원</div>
            </div>
          </div>
        </Card>
        <Card>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📋</div>
            <div style={styles.statContent}>
              <div style={{ ...styles.statValue, color: colors.accentRed }}>
                {stats?.pendingApprovals || 0}
              </div>
              <div style={styles.statLabel}>승인 대기</div>
            </div>
          </div>
        </Card>
        <Card>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🛒</div>
            <div style={styles.statContent}>
              <div style={styles.statValue}>{stats?.activeGroupbuys || 0}</div>
              <div style={styles.statLabel}>진행중 공동구매</div>
            </div>
          </div>
        </Card>
      </div>

      {/* 퀵 메뉴 */}
      <h2 style={styles.sectionTitle}>관리 메뉴</h2>
      <div style={styles.menuGrid}>
        <Link to="/admin/branches" style={styles.menuCard}>
          <div style={styles.menuIcon}>🏢</div>
          <div style={styles.menuContent}>
            <h3 style={styles.menuTitle}>분회 관리</h3>
            <p style={styles.menuDescription}>분회 생성, 수정, 삭제</p>
          </div>
          <div style={styles.menuArrow}>→</div>
        </Link>

        <Link to="/admin/members" style={styles.menuCard}>
          <div style={styles.menuIcon}>👥</div>
          <div style={styles.menuContent}>
            <h3 style={styles.menuTitle}>회원 관리</h3>
            <p style={styles.menuDescription}>회원 목록, 승인, 관리</p>
          </div>
          <div style={styles.menuArrow}>→</div>
        </Link>

        <Link to="/admin/officers" style={styles.menuCard}>
          <div style={styles.menuIcon}>👔</div>
          <div style={styles.menuContent}>
            <h3 style={styles.menuTitle}>임원 관리</h3>
            <p style={styles.menuDescription}>임원진 등록 및 수정</p>
          </div>
          <div style={styles.menuArrow}>→</div>
        </Link>

        <Link to="/admin/news" style={styles.menuCard}>
          <div style={styles.menuIcon}>📰</div>
          <div style={styles.menuContent}>
            <h3 style={styles.menuTitle}>공지/소식 관리</h3>
            <p style={styles.menuDescription}>공지사항 작성 및 관리</p>
          </div>
          <div style={styles.menuArrow}>→</div>
        </Link>

        <Link to="/admin/groupbuys" style={styles.menuCard}>
          <div style={styles.menuIcon}>🛒</div>
          <div style={styles.menuContent}>
            <h3 style={styles.menuTitle}>공동구매 관리</h3>
            <p style={styles.menuDescription}>공동구매 캠페인 관리</p>
          </div>
          <div style={styles.menuArrow}>→</div>
        </Link>

        <Link to="/admin/resources" style={styles.menuCard}>
          <div style={styles.menuIcon}>📁</div>
          <div style={styles.menuContent}>
            <h3 style={styles.menuTitle}>자료실 관리</h3>
            <p style={styles.menuDescription}>자료 업로드 및 관리</p>
          </div>
          <div style={styles.menuArrow}>→</div>
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '40px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '8px',
  },
  statIcon: {
    fontSize: '36px',
  },
  statContent: {},
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.primary,
  },
  statLabel: {
    fontSize: '14px',
    color: colors.neutral500,
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '20px',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
  },
  menuCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    textDecoration: 'none',
    gap: '16px',
    transition: 'all 0.2s',
  },
  menuIcon: {
    fontSize: '32px',
    flexShrink: 0,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  menuDescription: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '4px 0 0',
  },
  menuArrow: {
    fontSize: '20px',
    color: colors.neutral400,
  },
};
