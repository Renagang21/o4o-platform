/**
 * KpaOperatorDashboardPage - 플랫폼 운영 대시보드
 * WO-KPA-SOCIETY-OPERATOR-DASHBOARD-FRAME-V1
 *
 * Mock 데이터 금지. 데이터 없으면 "자료가 없음" 표시.
 * Real API: adminApi.getDashboardStats(), joinRequestApi.getPending()
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminHeader } from '../../components/admin';
import { adminApi } from '../../api/admin';
import { joinRequestApi } from '../../api/joinRequestApi';
import type { OrganizationJoinRequest } from '../../types/joinRequest';
import { JOIN_REQUEST_TYPE_LABELS } from '../../types/joinRequest';
import { colors } from '../../styles/theme';

interface DashboardStats {
  totalBranches: number;
  totalMembers: number;
  pendingApprovals: number;
  activeGroupbuys: number;
  recentPosts: number;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={styles.emptyState}>
      <p style={styles.emptyMessage}>{message}</p>
    </div>
  );
}

export function KpaOperatorDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingRequests, setPendingRequests] = useState<OrganizationJoinRequest[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, pendingRes] = await Promise.allSettled([
          adminApi.getDashboardStats(),
          joinRequestApi.getPending({ limit: 5 }),
        ]);
        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value.data);
        }
        if (pendingRes.status === 'fulfilled') {
          setPendingRequests(pendingRes.value.data.items);
          setPendingTotal(pendingRes.value.data.pagination.total);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div>
        <AdminHeader title="플랫폼 운영 대시보드" subtitle="KPA Society 전체 운영 현황" />
        <div style={styles.content}>
          <p style={styles.loadingText}>불러오는 중...</p>
        </div>
      </div>
    );
  }

  const statCards = stats
    ? [
        { label: '지부 수', value: stats.totalBranches, icon: '🏢', color: colors.primary, link: '/admin/divisions' },
        { label: '전체 회원', value: stats.totalMembers, icon: '👥', color: colors.accentGreen, link: '/admin/members' },
        { label: '승인 대기', value: stats.pendingApprovals, icon: '📋', color: colors.accentYellow, link: '/admin/organization-requests' },
        { label: '공동구매', value: stats.activeGroupbuys, icon: '🛒', color: colors.primary },
      ]
    : null;

  const quickActions = [
    { label: '회원 관리', icon: '👥', path: '/admin/members', description: '회원 목록 및 관리' },
    { label: '분회 관리', icon: '🏢', path: '/admin/divisions', description: '분회별 현황 조회' },
    { label: '조직 요청', icon: '📋', path: '/admin/organization-requests', description: '가입/역할 요청 처리' },
    { label: '위원회 관리', icon: '🏛️', path: '/admin/committee-requests', description: '위원회 요청 관리' },
    { label: '게시판', icon: '💬', path: '/admin/forum', description: '게시판 관리' },
    { label: '설정', icon: '⚙️', path: '/admin/settings', description: '지부 설정' },
  ];

  return (
    <div>
      <AdminHeader title="플랫폼 운영 대시보드" subtitle="KPA Society 전체 운영 현황" />

      <div style={styles.content}>
        {/* Section 1: 시스템 현황 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>시스템 현황</h2>
          {statCards ? (
            <div style={styles.statsGrid}>
              {statCards.map((stat) => {
                const inner = (
                  <div key={stat.label} style={styles.statCard}>
                    <div style={styles.statIcon}>{stat.icon}</div>
                    <div>
                      <div style={styles.statValue}>{stat.value}</div>
                      <div style={styles.statLabel}>{stat.label}</div>
                    </div>
                  </div>
                );
                return stat.link ? (
                  <Link key={stat.label} to={stat.link} style={{ textDecoration: 'none' }}>
                    {inner}
                  </Link>
                ) : (
                  <div key={stat.label}>{inner}</div>
                );
              })}
            </div>
          ) : (
            <EmptyState message="자료가 없음" />
          )}
        </div>

        {/* Section 2: 대기 중인 요청 */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>대기 중인 요청</h2>
            {pendingTotal > 0 && (
              <Link to="/admin/organization-requests" style={styles.viewAllLink}>
                전체 보기 ({pendingTotal}건) →
              </Link>
            )}
          </div>
          {pendingRequests.length > 0 ? (
            <div style={styles.requestList}>
              {pendingRequests.map((req) => (
                <div key={req.id} style={styles.requestItem}>
                  <div style={styles.requestInfo}>
                    <span style={styles.requestType}>
                      {JOIN_REQUEST_TYPE_LABELS[req.request_type] || req.request_type}
                    </span>
                    <span style={styles.requestDate}>
                      {new Date(req.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <span style={styles.pendingBadge}>대기</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="대기 중인 요청이 없습니다" />
          )}
        </div>

        {/* Section 3: 서비스 활동 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>서비스 활동</h2>
          <EmptyState message="자료가 없음" />
        </div>

        {/* Section 4: 빠른 관리 */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>빠른 관리</h2>
          <div style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <Link key={action.path} to={action.path} style={{ textDecoration: 'none' }}>
                <div style={styles.quickActionCard}>
                  <span style={styles.quickActionIcon}>{action.icon}</span>
                  <div>
                    <div style={styles.quickActionLabel}>{action.label}</div>
                    <div style={styles.quickActionDesc}>{action.description}</div>
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
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  loadingText: {
    textAlign: 'center',
    color: colors.neutral500,
    padding: '48px 0',
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 20px 0',
  },
  viewAllLink: {
    fontSize: '14px',
    color: colors.primary,
    textDecoration: 'none',
    marginBottom: '20px',
  },
  // Stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '24px',
    backgroundColor: colors.neutral50,
    borderRadius: '12px',
    transition: 'background-color 0.2s',
  },
  statIcon: {
    fontSize: '32px',
  },
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
  // Pending requests
  requestList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  requestItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  requestInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  requestType: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral800,
  },
  requestDate: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  pendingBadge: {
    padding: '4px 10px',
    backgroundColor: colors.accentYellow,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  // Quick actions
  quickActionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
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
  // Empty state
  emptyState: {
    textAlign: 'center',
    padding: '32px 0',
  },
  emptyMessage: {
    fontSize: '14px',
    color: colors.neutral400,
    margin: 0,
  },
};
