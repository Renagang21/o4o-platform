/**
 * HubPage - KPA-a 통합 운영 허브
 *
 * WO-KPA-A-HUB-ARCHITECTURE-RESTRUCTURE-V1
 * WO-PLATFORM-HUB-CORE-EXTRACTION-V1: hub-core 기반 전환
 * WO-PLATFORM-HUB-AI-SIGNAL-INTEGRATION-V1: AI 신호 연결
 *
 * 구조:
 *  1. 서비스 상태 요약 (beforeSections)
 *  2. Operator 실행 카드 + 신호 배지 (hub-core HubLayout)
 *  3. Admin 전용 카드 (hub-core HubLayout)
 *  4. 최근 활동 로그 (afterSections)
 *
 * 권한: requireKpaScope('kpa:operator') 이상
 * Admin은 자동 포함 (KPA_SCOPE_CONFIG)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { ROLES } from '../../lib/role-constants';
import { operatorApi, type OperatorSummary } from '../../api/operator';
import { colors, shadows, borderRadius, spacing } from '../../styles/theme';
import { HubLayout, createSignal, createActionSignal } from '@o4o/hub-core';
import type { HubSectionDefinition, HubSignal, HubActionResult } from '@o4o/hub-core';
import { apiClient } from '../../api/client';
import {
  Users,
  MessageSquare,
  FileText,
  GraduationCap,
  ShoppingCart,
  BrainCircuit,
  Building2,
  Shield,
  LayoutGrid,
  Settings,
  UserCog,
  ScrollText,
  Activity,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Megaphone,
  FolderOpen,
  UserPlus,
  ClipboardList,
} from 'lucide-react';

// ─── Icon helper ───

function LucideIcon({ Icon, color }: { Icon: React.ComponentType<{ style?: React.CSSProperties }>; color: string }) {
  return <Icon style={{ width: 22, height: 22, color }} />;
}

// ─── Section Definitions ───

/**
 * WO-KPA-ADMIN-OPERATOR-MENU-REALIGNMENT-V1:
 * - Operator 섹션: 콘텐츠 CRUD + 상태 관리 (운영 업무)
 * - Admin 섹션: 구조 관리 (회원, 조직, 역할, 정책)
 */
const HUB_SECTIONS: HubSectionDefinition[] = [
  {
    id: 'operator',
    title: '운영 관리',
    cards: [
      {
        id: 'forum',
        title: '포럼 관리',
        description: '게시글 관리, 중재',
        href: '/operator/forum-management',
        icon: <LucideIcon Icon={MessageSquare} color="#D97706" />,
        iconBg: '#FEF3C7',
        signalKey: 'forum',
      },
      {
        id: 'content',
        title: '콘텐츠 관리',
        description: '공지, 뉴스 작성/관리',
        href: '/operator/content',
        icon: <LucideIcon Icon={FileText} color="#7C3AED" />,
        iconBg: '#F3E8FF',
        signalKey: 'content',
      },
      {
        id: 'news',
        title: '공지사항',
        description: '공지사항 작성/관리',
        href: '/operator/news',
        icon: <LucideIcon Icon={Megaphone} color="#0891B2" />,
        iconBg: '#ECFEFF',
      },
      {
        id: 'docs',
        title: '자료실',
        description: '자료 등록/관리',
        href: '/operator/docs',
        icon: <LucideIcon Icon={FolderOpen} color="#7C3AED" />,
        iconBg: '#F5F3FF',
      },
      {
        id: 'organization-requests',
        title: '가입 요청 관리',
        description: '조직 가입/역할 요청 심사',
        href: '/operator/organization-requests',
        icon: <LucideIcon Icon={UserPlus} color="#059669" />,
        iconBg: '#ECFDF5',
      },
      {
        id: 'service-enrollments',
        title: '서비스 신청 관리',
        description: '서비스 신청 승인/관리',
        href: '/operator/service-enrollments',
        icon: <LucideIcon Icon={ClipboardList} color="#D97706" />,
        iconBg: '#FFFBEB',
      },
      {
        id: 'lms',
        title: '강의 관리',
        description: '강좌, 수강, 수료증',
        href: '/lms/courses',
        icon: <LucideIcon Icon={GraduationCap} color="#059669" />,
        iconBg: '#ECFDF5',
      },
      {
        id: 'groupbuy',
        title: '공동구매 관리',
        description: '공동구매 운영',
        href: '/groupbuy',
        icon: <LucideIcon Icon={ShoppingCart} color="#EA580C" />,
        iconBg: '#FFF7ED',
        signalKey: 'groupbuy',
      },
      {
        id: 'ai-report',
        title: 'AI 리포트',
        description: 'AI 운영 분석 보고서',
        href: '/operator/ai-report',
        icon: <LucideIcon Icon={BrainCircuit} color="#0284C7" />,
        iconBg: '#F0F9FF',
      },
    ],
  },
  {
    id: 'admin',
    title: '관리자 전용',
    badge: 'Admin',
    roles: [ROLES.KPA_ADMIN],
    cards: [
      {
        id: 'organizations',
        title: '조직 관리',
        description: '조직 구조 관리',
        href: '/demo/admin/dashboard',
        icon: <LucideIcon Icon={Building2} color="#DC2626" />,
        iconBg: '#FEF2F2',
        signalKey: 'kpa.organizations',
      },
      {
        id: 'members',
        title: '회원 관리',
        description: '회원 승인, 역할 관리',
        href: '/demo/admin/members',
        icon: <LucideIcon Icon={Users} color="#2563EB" />,
        iconBg: '#EFF6FF',
        signalKey: 'kpa.members',
      },
      {
        id: 'role-mgmt',
        title: 'Role 관리',
        description: '역할 배정, 권한 설정',
        href: '/operator/operators',
        icon: <LucideIcon Icon={Shield} color="#A855F7" />,
        iconBg: '#FDF4FF',
      },
      {
        id: 'forum-structure',
        title: '포럼 구조 관리',
        description: '카테고리 생성/수정/삭제',
        href: '/operator/forum-management',
        icon: <LucideIcon Icon={LayoutGrid} color="#B45309" />,
        iconBg: '#FFFBEB',
      },
      {
        id: 'policy',
        title: '정책 설정',
        description: '약관, 정책 관리',
        href: '/operator/legal',
        icon: <LucideIcon Icon={Settings} color="#475569" />,
        iconBg: '#F1F5F9',
      },
      {
        id: 'stewards',
        title: '간사 관리',
        description: '간사 배정, 관리',
        href: '/demo/admin/stewards',
        icon: <LucideIcon Icon={UserCog} color="#047857" />,
        iconBg: '#ECFDF5',
      },
      {
        id: 'audit-logs',
        title: '감사 로그',
        description: '운영 활동 감사 기록',
        href: '/operator/audit-logs',
        icon: <LucideIcon Icon={ScrollText} color="#1D4ED8" />,
        iconBg: '#EFF6FF',
      },
    ],
  },
];

// ─── Hub Data ───

interface KpaHubData {
  summary: OperatorSummary | null;
  pendingMembers: number | null;
  groupbuyStats: { totalOrders: number; totalParticipants: number } | null;
  adminStats: { totalBranches: number; pendingApprovals: number } | null;
}

// ─── Signal Mapper ───

function buildKpaSignals(data: KpaHubData): Record<string, HubSignal> {
  const signals: Record<string, HubSignal> = {};
  const { summary, pendingMembers, groupbuyStats, adminStats } = data;

  if (summary) {
    // 콘텐츠 신호
    const contentCount = summary.content?.totalPublished ?? 0;
    if (contentCount === 0) {
      signals.content = createSignal('warning', { label: '게시물 없음' });
    } else {
      signals.content = createSignal('info', { label: '게시됨', count: contentCount });
    }

    // 포럼 신호
    const forumCount = summary.forum?.totalPosts ?? 0;
    if (forumCount === 0) {
      signals.forum = createSignal('warning', { label: '게시글 없음' });
    } else {
      signals.forum = createSignal('info', { label: '게시글', count: forumCount });
    }
  }

  // 회원 승인 대기 신호
  if (pendingMembers !== null) {
    if (pendingMembers > 0) {
      signals['kpa.members'] = createActionSignal('warning', {
        label: '승인 대기',
        count: pendingMembers,
        action: {
          key: 'kpa.navigate.members_pending',
          buttonLabel: '확인하기',
        },
      });
    } else {
      signals['kpa.members'] = createSignal('info', { label: '정상' });
    }
  }

  // 공동구매 신호
  if (groupbuyStats) {
    if (groupbuyStats.totalOrders > 0) {
      signals.groupbuy = createSignal('info', {
        label: '주문',
        count: groupbuyStats.totalOrders,
      });
    } else if (groupbuyStats.totalParticipants > 0) {
      signals.groupbuy = createSignal('info', {
        label: '참여 약국',
        count: groupbuyStats.totalParticipants,
      });
    } else {
      signals.groupbuy = createSignal('warning', { label: '미운영' });
    }
  }

  // 매장 강제노출 만료 임박 신호
  if (summary?.store?.forcedExpirySoon) {
    const count = summary.store.forcedExpirySoon;
    if (count > 0) {
      signals['kpa.store'] = createActionSignal('warning', {
        label: '만료 임박',
        count,
        action: {
          key: 'kpa.navigate.forced_expiry',
          buttonLabel: '확인하기',
        },
      });
    }
  }

  // 조직 관리 신호 (Admin 카드)
  if (adminStats) {
    if (adminStats.pendingApprovals > 0) {
      signals['kpa.organizations'] = createActionSignal('warning', {
        label: '가입 대기',
        count: adminStats.pendingApprovals,
        action: {
          key: 'kpa.navigate.org_approvals',
          buttonLabel: '심사하기',
        },
      });
    } else {
      signals['kpa.organizations'] = createSignal('info', {
        label: '분회',
        count: adminStats.totalBranches,
      });
    }
  }

  return signals;
}

// ─── Component ───

export default function HubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hubData, setHubData] = useState<KpaHubData>({
    summary: null,
    pendingMembers: null,
    groupbuyStats: null,
    adminStats: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userRoles = user?.roles ?? [];
  const isAdmin = userRoles.includes(ROLES.KPA_ADMIN);
  const signals = useMemo(() => buildKpaSignals(hubData), [hubData]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Promise.allSettled: 개별 실패로 전체 허브가 중단되지 않음 (UX Guidelines §6.1)
      const promises: Promise<any>[] = [
        operatorApi.getSummary(),
        apiClient.get('/members', { status: 'pending', pageSize: 1 }),
        apiClient.get('/groupbuy-admin/stats'),
      ];

      if (isAdmin) {
        promises.push(apiClient.get('/admin/dashboard/stats'));
      }

      const results = await Promise.allSettled(promises);

      // Log individual failures for debugging
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`[KPA Hub] fetch[${i}] failed:`, r.reason);
        }
      });

      const summaryRes = results[0].status === 'fulfilled' ? results[0].value : null;
      const membersRes = results[1].status === 'fulfilled' ? results[1].value : null;
      const groupbuyRes = results[2].status === 'fulfilled' ? results[2].value : null;
      const adminRes = isAdmin && results[3]?.status === 'fulfilled' ? results[3].value : null;

      setHubData({
        summary: summaryRes?.data ?? null,
        pendingMembers: membersRes?.total ?? membersRes?.data?.total ?? null,
        groupbuyStats: groupbuyRes?.data ?? null,
        adminStats: adminRes?.data ?? null,
      });
    } catch {
      setError('운영 데이터를 불러오지 못했습니다.');
    }

    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // QuickAction handler — 경량 허브: navigate-only 액션
  const handleActionTrigger = useCallback(
    async (key: string): Promise<HubActionResult> => {
      switch (key) {
        case 'kpa.navigate.members_pending':
          navigate('/demo/admin/members');
          return { success: true, message: '회원 관리 페이지로 이동' };
        case 'kpa.navigate.org_approvals':
          navigate('/demo/admin/dashboard');
          return { success: true, message: '조직 관리 페이지로 이동' };
        case 'kpa.navigate.forced_expiry':
          navigate('/pharmacy/assets?view=forced-expiring');
          return { success: true, message: '강제노출 만료 임박 목록으로 이동' };
        default:
          return { success: false, message: '알 수 없는 액션' };
      }
    },
    [navigate],
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.neutral50 }}>
      <HubLayout
        title="운영 허브"
        subtitle="서비스 운영 현황을 한눈에 확인하고 관리하세요"
        sections={HUB_SECTIONS}
        userRoles={userRoles}
        signals={signals}
        onCardClick={(href) => navigate(href)}
        onActionTrigger={handleActionTrigger}
        beforeSections={
          <>
            {/* 새로고침 버튼 */}
            <div style={styles.refreshRow}>
              <button
                style={styles.refreshButton}
                onClick={fetchData}
                disabled={loading}
              >
                <RefreshCw style={{ width: 16, height: 16, ...(loading ? { animation: 'spin 1s linear infinite' } : {}) }} />
                새로고침
              </button>
            </div>

            {/* 서비스 상태 요약 */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>서비스 상태</h2>
              {loading ? (
                <div style={styles.loadingBox}>
                  <Loader2 style={{ width: 24, height: 24, color: colors.primary, animation: 'spin 1s linear infinite' }} />
                  <span style={{ color: colors.neutral500, fontSize: '14px' }}>데이터 로딩 중...</span>
                </div>
              ) : error ? (
                <div style={styles.errorBox}>
                  <AlertCircle style={{ width: 20, height: 20, color: colors.error }} />
                  <span style={{ color: colors.error, fontSize: '14px' }}>{error}</span>
                </div>
              ) : (
                <>
                  <div style={styles.statusGrid}>
                    <StatusCard
                      label="콘텐츠"
                      count={hubData.summary?.content?.totalPublished ?? 0}
                      unit="건 게시됨"
                      status={hubData.summary?.content?.totalPublished ? 'good' : 'warning'}
                    />
                    <StatusCard
                      label="포럼"
                      count={hubData.summary?.forum?.totalPosts ?? 0}
                      unit="건 게시글"
                      status={hubData.summary?.forum?.totalPosts ? 'good' : 'warning'}
                    />
                    <StatusCard
                      label="사이니지"
                      count={(hubData.summary?.signage?.totalMedia ?? 0) + (hubData.summary?.signage?.totalPlaylists ?? 0)}
                      unit="건 미디어"
                      status={(hubData.summary?.signage?.totalMedia ?? 0) > 0 ? 'good' : 'warning'}
                    />
                  </div>
                  {/* WO-HUB-RISK-LOOP-COMPLETION-V1: 강제노출 만료 임박 경고 */}
                  {(hubData.summary?.store?.forcedExpirySoon ?? 0) > 0 && (
                    <div
                      style={styles.storeWarningBanner}
                      onClick={() => navigate('/pharmacy/assets?view=forced-expiring')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && navigate('/pharmacy/assets?view=forced-expiring')}
                    >
                      <AlertCircle style={{ width: 18, height: 18, color: '#D97706', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '13px', color: '#92400E' }}>
                        매장 자산 강제노출 <strong>{hubData.summary!.store!.forcedExpirySoon}건</strong>이 7일 이내 만료됩니다
                      </span>
                      <span style={{ fontSize: '12px', color: '#D97706', fontWeight: 500 }}>{'확인하기 →'}</span>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        }
        afterSections={
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>최근 활동</h2>
            {!loading && hubData.summary && (
              <RecentActivityList summary={hubData.summary} />
            )}
            {!loading && !hubData.summary && !error && (
              <p style={{ color: colors.neutral500, fontSize: '14px' }}>활동 데이터가 없습니다.</p>
            )}
          </section>
        }
        footerNote="허브는 각 기능의 진입점입니다. 상세 작업은 각 페이지에서 진행해주세요."
      />
    </div>
  );
}

// ─── Sub Components ───

function StatusCard({ label, count, unit, status }: {
  label: string;
  count: number;
  unit: string;
  status: 'good' | 'warning';
}) {
  return (
    <div style={styles.statusCard}>
      <div style={styles.statusCardHeader}>
        {status === 'good'
          ? <CheckCircle2 style={{ width: 18, height: 18, color: colors.success }} />
          : <AlertCircle style={{ width: 18, height: 18, color: colors.warning }} />
        }
        <span style={styles.statusLabel}>{label}</span>
      </div>
      <div style={styles.statusValue}>
        <span style={styles.statusCount}>{count}</span>
        <span style={styles.statusUnit}>{unit}</span>
      </div>
    </div>
  );
}

function RecentActivityList({ summary }: { summary: OperatorSummary }) {
  const items: { id: string; type: string; title: string; date: string }[] = [];

  for (const c of summary.content?.recentItems || []) {
    items.push({
      id: `c-${c.id}`,
      type: '콘텐츠',
      title: c.title,
      date: c.publishedAt || c.createdAt,
    });
  }
  for (const p of summary.forum?.recentPosts || []) {
    items.push({
      id: `f-${p.id}`,
      type: '포럼',
      title: p.title,
      date: p.createdAt,
    });
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const display = items.slice(0, 8);

  if (display.length === 0) {
    return <p style={{ color: colors.neutral500, fontSize: '14px' }}>최근 활동이 없습니다.</p>;
  }

  return (
    <div style={styles.activityList}>
      {display.map(item => (
        <div key={item.id} style={styles.activityItem}>
          <Activity style={{ width: 16, height: 16, color: colors.neutral400, flexShrink: 0, marginTop: 2 }} />
          <div style={styles.activityContent}>
            <span style={styles.activityType}>{item.type}</span>
            <span style={styles.activityTitle}>{item.title}</span>
          </div>
          <span style={styles.activityDate}>
            {formatRelativeDate(item.date)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

// ─── Styles ───

const styles: Record<string, React.CSSProperties> = {
  refreshRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
    marginTop: `-${spacing.md}`,
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    fontSize: '13px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: `0 0 ${spacing.md} 0`,
  },

  // Status cards
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: spacing.md,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral200}`,
  },
  statusCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  statusLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral600,
  },
  statusValue: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
  },
  statusCount: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  statusUnit: {
    fontSize: '13px',
    color: colors.neutral500,
  },

  // Store warning banner
  storeWarningBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: spacing.md,
    padding: '12px 16px',
    backgroundColor: '#FFFBEB',
    border: '1px solid #FDE68A',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },

  // Loading / Error
  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: spacing.xl,
    justifyContent: 'center',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: spacing.lg,
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.md,
  },

  // Activity list
  activityList: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral200}`,
    overflow: 'hidden',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 20px',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  activityContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    flex: 1,
    minWidth: 0,
  },
  activityType: {
    fontSize: '11px',
    fontWeight: 600,
    color: colors.primary,
    textTransform: 'uppercase' as const,
  },
  activityTitle: {
    fontSize: '14px',
    color: colors.neutral800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  activityDate: {
    fontSize: '12px',
    color: colors.neutral400,
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
  },
};
