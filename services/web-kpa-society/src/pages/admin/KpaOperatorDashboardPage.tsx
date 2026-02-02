/**
 * KpaOperatorDashboardPage - 플랫폼 운영 대시보드
 * WO-KPA-SOCIETY-OPERATOR-DASHBOARD-FRAME-V1
 *
 * WordPress Admin UI/UX 스타일 적용:
 * - 보더 리스트 아이템 (좌측 액센트 보더)
 * - 필터 드롭다운
 * - 뱃지/태그 인디케이터
 * - 깔끔한 테이블형 레이아웃
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
    <div style={wp.emptyState}>
      <p style={wp.emptyText}>{message}</p>
    </div>
  );
}

export function KpaOperatorDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingRequests, setPendingRequests] = useState<OrganizationJoinRequest[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [requestFilter, setRequestFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, pendingRes] = await Promise.allSettled([
          adminApi.getDashboardStats(),
          joinRequestApi.getPending({ limit: 10 }),
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
        <div style={wp.content}>
          <p style={wp.loadingText}>불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 요청 필터링
  const filteredRequests = requestFilter === 'all'
    ? pendingRequests
    : pendingRequests.filter(r => r.request_type === requestFilter);

  const requestTypes = Array.from(new Set(pendingRequests.map(r => r.request_type)));

  return (
    <div>
      <AdminHeader title="플랫폼 운영 대시보드" subtitle="KPA Society 전체 운영 현황" />

      <div style={wp.content}>
        {/* ─── Section 1: 시스템 현황 (WordPress 메트릭 카드) ─── */}
        <div style={wp.wpBox}>
          <div style={wp.wpBoxHeader}>
            <h2 style={wp.wpBoxTitle}>시스템 현황</h2>
            <span style={wp.wpBoxSubtitle}>플랫폼 전체 통계</span>
          </div>
          {stats ? (
            <div style={wp.metricsRow}>
              <Link to="/admin/divisions" style={{ textDecoration: 'none', flex: 1 }}>
                <div style={wp.metricItem}>
                  <div style={wp.metricValue}>{stats.totalBranches}</div>
                  <div style={wp.metricLabel}>지부</div>
                </div>
              </Link>
              <div style={wp.metricDivider} />
              <Link to="/admin/members" style={{ textDecoration: 'none', flex: 1 }}>
                <div style={wp.metricItem}>
                  <div style={wp.metricValue}>{stats.totalMembers}</div>
                  <div style={wp.metricLabel}>전체 회원</div>
                </div>
              </Link>
              <div style={wp.metricDivider} />
              <Link to="/admin/organization-requests" style={{ textDecoration: 'none', flex: 1 }}>
                <div style={wp.metricItem}>
                  <div style={{ ...wp.metricValue, color: stats.pendingApprovals > 0 ? colors.accentYellow : colors.neutral900 }}>
                    {stats.pendingApprovals}
                  </div>
                  <div style={wp.metricLabel}>승인 대기</div>
                </div>
              </Link>
              <div style={wp.metricDivider} />
              <div style={{ flex: 1 }}>
                <div style={wp.metricItem}>
                  <div style={wp.metricValue}>{stats.activeGroupbuys}</div>
                  <div style={wp.metricLabel}>공동구매</div>
                </div>
              </div>
              <div style={wp.metricDivider} />
              <div style={{ flex: 1 }}>
                <div style={wp.metricItem}>
                  <div style={wp.metricValue}>{stats.recentPosts}</div>
                  <div style={wp.metricLabel}>최근 게시글</div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="자료가 없음" />
          )}
        </div>

        {/* ─── Section 2: 대기 중인 요청 (WordPress 리스트 스타일) ─── */}
        <div style={wp.wpBox}>
          <div style={wp.wpBoxHeader}>
            <div>
              <h2 style={wp.wpBoxTitle}>대기 중인 요청</h2>
              <span style={wp.wpBoxSubtitle}>
                접근 가능한 모든 요청을 탐색합니다
              </span>
            </div>
            {pendingTotal > 0 && (
              <span style={wp.itemCount}>{pendingTotal}개 항목</span>
            )}
          </div>

          {/* 필터 바 (WordPress tablenav) */}
          {pendingRequests.length > 0 && (
            <div style={wp.filterBar}>
              <select
                value={requestFilter}
                onChange={(e) => setRequestFilter(e.target.value)}
                style={wp.filterSelect}
              >
                <option value="all">전체 유형</option>
                {requestTypes.map(type => (
                  <option key={type} value={type}>
                    {JOIN_REQUEST_TYPE_LABELS[type] || type}
                  </option>
                ))}
              </select>
              <span style={wp.filterCount}>{filteredRequests.length}개 항목</span>
            </div>
          )}

          {/* 요청 리스트 (WordPress bordered list with left accent) */}
          {filteredRequests.length > 0 ? (
            <div style={wp.listContainer}>
              {filteredRequests.map((req) => (
                <div key={req.id} style={wp.listItem}>
                  <div style={wp.listItemLeft}>
                    <div style={wp.listItemAccent} />
                    <div style={wp.listItemContent}>
                      <div style={wp.listItemTitle}>
                        {JOIN_REQUEST_TYPE_LABELS[req.request_type] || req.request_type}
                      </div>
                      <div style={wp.listItemMeta}>
                        요청일: {new Date(req.created_at).toLocaleDateString('ko-KR')}
                        {req.requested_role && (
                          <> · 요청 역할: {req.requested_role}</>
                        )}
                      </div>
                    </div>
                  </div>
                  <span style={wp.badge}>대기</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="대기 중인 요청이 없습니다" />
          )}

          {/* 하단 링크 (WordPress footer link) */}
          {pendingTotal > 0 && (
            <div style={wp.boxFooter}>
              <Link to="/admin/organization-requests" style={wp.footerLink}>
                요청 전체 보기 →
              </Link>
            </div>
          )}
        </div>

        {/* ─── Section 3: 서비스 활동 ─── */}
        <div style={wp.wpBox}>
          <div style={wp.wpBoxHeader}>
            <h2 style={wp.wpBoxTitle}>서비스 활동</h2>
            <span style={wp.wpBoxSubtitle}>최근 플랫폼 활동 내역</span>
          </div>
          <EmptyState message="자료가 없음" />
        </div>

        {/* ─── Section 4: 빠른 관리 (WordPress 리스트 링크) ─── */}
        <div style={wp.wpBox}>
          <div style={wp.wpBoxHeader}>
            <h2 style={wp.wpBoxTitle}>빠른 관리</h2>
            <span style={wp.wpBoxSubtitle}>관리 페이지 바로가기</span>
          </div>
          <div style={wp.listContainer}>
            {[
              { label: '회원 관리', desc: '회원 목록 및 관리', path: '/admin/members', type: '관리' },
              { label: '분회 관리', desc: '분회별 현황 조회', path: '/admin/divisions', type: '관리' },
              { label: '조직 요청', desc: '가입/역할 요청 처리', path: '/admin/organization-requests', type: '요청' },
              { label: '위원회 관리', desc: '위원회 요청 관리', path: '/admin/committee-requests', type: '요청' },
              { label: '서비스 신청', desc: '서비스 이용 신청 승인/반려', path: '/admin/service-enrollments', type: '관리' },
              { label: '게시판', desc: '게시판 관리', path: '/admin/forum', type: '콘텐츠' },
              { label: '설정', desc: '지부 설정', path: '/admin/settings', type: '설정' },
            ].map((action) => (
              <Link key={action.path} to={action.path} style={{ textDecoration: 'none' }}>
                <div style={wp.listItem}>
                  <div style={wp.listItemLeft}>
                    <div style={wp.listItemAccent} />
                    <div style={wp.listItemContent}>
                      <div style={wp.listItemTitle}>{action.label}</div>
                      <div style={wp.listItemMeta}>{action.desc}</div>
                    </div>
                  </div>
                  <span style={wp.badgeNeutral}>{action.type}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WordPress Admin 스타일 ──────────────────────────────────
const wp: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    backgroundColor: '#f0f0f1', // WordPress admin bg
  },
  loadingText: {
    textAlign: 'center',
    color: colors.neutral500,
    padding: '48px 0',
    margin: 0,
  },

  // WordPress Box (postbox pattern)
  wpBox: {
    backgroundColor: colors.white,
    border: '1px solid #c3c4c7', // WordPress border color
    borderRadius: '0',
    boxShadow: '0 1px 1px rgba(0,0,0,0.04)',
  },
  wpBoxHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '16px 20px',
    borderBottom: '1px solid #c3c4c7',
  },
  wpBoxTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1d2327', // WordPress heading color
    margin: 0,
  },
  wpBoxSubtitle: {
    fontSize: '13px',
    color: '#646970', // WordPress description color
    marginTop: '2px',
    display: 'block',
  },
  itemCount: {
    fontSize: '13px',
    color: '#646970',
    whiteSpace: 'nowrap',
  },

  // Metrics row (WordPress at-a-glance style)
  metricsRow: {
    display: 'flex',
    alignItems: 'stretch',
  },
  metricItem: {
    textAlign: 'center',
    padding: '24px 16px',
  },
  metricValue: {
    fontSize: '28px',
    fontWeight: 600,
    color: '#1d2327',
    lineHeight: 1.2,
  },
  metricLabel: {
    fontSize: '13px',
    color: '#646970',
    marginTop: '4px',
  },
  metricDivider: {
    width: '1px',
    backgroundColor: '#c3c4c7',
    alignSelf: 'stretch',
  },

  // Filter bar (WordPress tablenav)
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 20px',
    borderBottom: '1px solid #c3c4c7',
    backgroundColor: '#f6f7f7', // WordPress toolbar bg
  },
  filterSelect: {
    fontSize: '13px',
    padding: '4px 8px',
    border: '1px solid #8c8f94',
    borderRadius: '3px',
    backgroundColor: colors.white,
    color: '#2c3338',
    outline: 'none',
  },
  filterCount: {
    fontSize: '13px',
    color: '#646970',
    marginLeft: 'auto',
  },

  // List (WordPress bordered list with accent)
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid #dcdcde',
    transition: 'background-color 0.1s',
    cursor: 'default',
  },
  listItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  listItemAccent: {
    width: '4px',
    height: '40px',
    backgroundColor: '#d97706', // amber accent (like screenshot)
    borderRadius: '2px',
    flexShrink: 0,
  },
  listItemContent: {},
  listItemTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1d2327',
  },
  listItemMeta: {
    fontSize: '13px',
    color: '#646970',
    marginTop: '2px',
  },

  // Badges
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '3px',
    whiteSpace: 'nowrap',
  },
  badgeNeutral: {
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '3px',
    whiteSpace: 'nowrap',
  },

  // Footer
  boxFooter: {
    padding: '12px 20px',
    borderTop: '1px solid #dcdcde',
  },
  footerLink: {
    fontSize: '13px',
    color: '#2271b1', // WordPress link color
    textDecoration: 'none',
    fontWeight: 500,
  },

  // Empty state
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyText: {
    fontSize: '13px',
    color: '#a7aaad',
    margin: 0,
  },
};
