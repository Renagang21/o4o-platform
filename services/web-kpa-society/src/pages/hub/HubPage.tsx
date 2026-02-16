/**
 * HubPage - KPA-a 통합 운영 허브
 *
 * WO-KPA-A-HUB-ARCHITECTURE-RESTRUCTURE-V1
 *
 * 구조:
 *  1. 서비스 상태 요약 (공통)
 *  2. 실행 카드 영역 (Operator 기본)
 *  3. Admin 전용 카드 영역 (Admin만 노출)
 *  4. 최근 활동 로그 (공통)
 *
 * 권한: requireKpaScope('kpa:operator') 이상
 * Admin은 자동 포함 (KPA_SCOPE_CONFIG)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { operatorApi, type OperatorSummary } from '../../api/operator';
import { colors, shadows, borderRadius, spacing } from '../../styles/theme';
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
} from 'lucide-react';

// ─── Types ───

interface HubCard {
  id: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
}

// ─── Card Definitions ───

const OPERATOR_CARDS: HubCard[] = [
  {
    id: 'members',
    icon: Users,
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    title: '회원 관리',
    description: '회원 승인, 역할 관리',
    href: '/operator/members',
  },
  {
    id: 'forum',
    icon: MessageSquare,
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    title: '포럼 관리',
    description: '게시글 관리, 중재',
    href: '/operator/forum-management',
  },
  {
    id: 'content',
    icon: FileText,
    iconBg: '#F3E8FF',
    iconColor: '#7C3AED',
    title: '콘텐츠 관리',
    description: '공지, 뉴스 작성/관리',
    href: '/operator/content',
  },
  {
    id: 'lms',
    icon: GraduationCap,
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    title: '강의 관리',
    description: '강좌, 수강, 수료증',
    href: '/lms/courses',
  },
  {
    id: 'groupbuy',
    icon: ShoppingCart,
    iconBg: '#FFF7ED',
    iconColor: '#EA580C',
    title: '공동구매 관리',
    description: '공동구매 운영',
    href: '/groupbuy',
  },
  {
    id: 'ai-report',
    icon: BrainCircuit,
    iconBg: '#F0F9FF',
    iconColor: '#0284C7',
    title: 'AI 리포트',
    description: 'AI 운영 분석 보고서',
    href: '/operator/ai-report',
  },
];

const ADMIN_CARDS: HubCard[] = [
  {
    id: 'organizations',
    icon: Building2,
    iconBg: '#FEF2F2',
    iconColor: '#DC2626',
    title: '조직 관리',
    description: '조직 구조 관리',
    href: '/demo/admin/dashboard',
  },
  {
    id: 'role-mgmt',
    icon: Shield,
    iconBg: '#FDF4FF',
    iconColor: '#A855F7',
    title: 'Role 관리',
    description: '역할 배정, 권한 설정',
    href: '/operator/operators',
  },
  {
    id: 'forum-structure',
    icon: LayoutGrid,
    iconBg: '#FFFBEB',
    iconColor: '#B45309',
    title: '포럼 구조 관리',
    description: '카테고리 생성/수정/삭제',
    href: '/operator/forum-management',
  },
  {
    id: 'policy',
    icon: Settings,
    iconBg: '#F1F5F9',
    iconColor: '#475569',
    title: '정책 설정',
    description: '약관, 정책 관리',
    href: '/operator/legal',
  },
  {
    id: 'stewards',
    icon: UserCog,
    iconBg: '#ECFDF5',
    iconColor: '#047857',
    title: '간사 관리',
    description: '간사 배정, 관리',
    href: '/demo/admin/stewards',
  },
  {
    id: 'audit-logs',
    icon: ScrollText,
    iconBg: '#EFF6FF',
    iconColor: '#1D4ED8',
    title: '감사 로그',
    description: '운영 활동 감사 기록',
    href: '/operator/audit-logs',
  },
];

// ─── Component ───

export default function HubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState<OperatorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.roles?.includes('kpa:admin') ?? false;

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operatorApi.getSummary();
      setSummary(res.data);
    } catch {
      setError('운영 데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>운영 허브</h1>
            <p style={styles.subtitle}>서비스 운영 현황을 한눈에 확인하고 관리하세요</p>
          </div>
          <button
            style={styles.refreshButton}
            onClick={fetchSummary}
            disabled={loading}
          >
            <RefreshCw style={{ width: 16, height: 16, ...(loading ? { animation: 'spin 1s linear infinite' } : {}) }} />
            새로고침
          </button>
        </div>

        {/* 1. 서비스 상태 요약 */}
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
            <div style={styles.statusGrid}>
              <StatusCard
                label="콘텐츠"
                count={summary?.content?.totalPublished ?? 0}
                unit="건 게시됨"
                status={summary?.content?.totalPublished ? 'good' : 'warning'}
              />
              <StatusCard
                label="포럼"
                count={summary?.forum?.totalPosts ?? 0}
                unit="건 게시글"
                status={summary?.forum?.totalPosts ? 'good' : 'warning'}
              />
              <StatusCard
                label="사이니지"
                count={(summary?.signage?.totalMedia ?? 0) + (summary?.signage?.totalPlaylists ?? 0)}
                unit="건 미디어"
                status={(summary?.signage?.totalMedia ?? 0) > 0 ? 'good' : 'warning'}
              />
            </div>
          )}
        </section>

        {/* 2. Operator 실행 카드 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>운영 관리</h2>
          <div style={styles.cardGrid}>
            {OPERATOR_CARDS.map(card => (
              <HubCardItem key={card.id} card={card} onClick={() => navigate(card.href)} />
            ))}
          </div>
        </section>

        {/* 3. Admin 전용 카드 */}
        {isAdmin && (
          <section style={styles.section}>
            <div style={styles.adminSectionHeader}>
              <h2 style={styles.sectionTitle}>관리자 전용</h2>
              <span style={styles.adminBadge}>Admin</span>
            </div>
            <div style={styles.cardGrid}>
              {ADMIN_CARDS.map(card => (
                <HubCardItem key={card.id} card={card} onClick={() => navigate(card.href)} />
              ))}
            </div>
          </section>
        )}

        {/* 4. 최근 활동 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>최근 활동</h2>
          {!loading && summary && (
            <RecentActivityList summary={summary} />
          )}
          {!loading && !summary && !error && (
            <p style={{ color: colors.neutral500, fontSize: '14px' }}>활동 데이터가 없습니다.</p>
          )}
        </section>
      </div>
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

function HubCardItem({ card, onClick }: { card: HubCard; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const Icon = card.icon;

  return (
    <button
      style={{
        ...styles.card,
        ...(hovered ? styles.cardHover : {}),
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ ...styles.cardIcon, backgroundColor: card.iconBg }}>
        <Icon style={{ width: 22, height: 22, color: card.iconColor }} />
      </div>
      <div style={styles.cardContent}>
        <span style={styles.cardTitle}>{card.title}</span>
        <span style={styles.cardDescription}>{card.description}</span>
      </div>
    </button>
  );
}

function RecentActivityList({ summary }: { summary: OperatorSummary }) {
  const items: { id: string; type: string; title: string; detail: string; date: string }[] = [];

  for (const c of summary.content?.recentItems || []) {
    items.push({
      id: `c-${c.id}`,
      type: '콘텐츠',
      title: c.title,
      detail: c.type || '',
      date: c.publishedAt || c.createdAt,
    });
  }
  for (const p of summary.forum?.recentPosts || []) {
    items.push({
      id: `f-${p.id}`,
      type: '포럼',
      title: p.title,
      detail: p.authorName || '익명',
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
  page: {
    minHeight: '100vh',
    backgroundColor: colors.neutral50,
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: `${spacing.xl} ${spacing.lg}`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  subtitle: {
    fontSize: '15px',
    color: colors.neutral500,
    marginTop: '6px',
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
  adminSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: spacing.md,
  },
  adminBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: colors.error,
    backgroundColor: '#FEF2F2',
    padding: '2px 8px',
    borderRadius: '10px',
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

  // Hub cards
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: spacing.md,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral200}`,
    boxShadow: shadows.sm,
    cursor: 'pointer',
    transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.15s',
    textAlign: 'left',
    width: '100%',
  },
  cardHover: {
    boxShadow: shadows.md,
    borderColor: colors.primary,
    transform: 'translateY(-1px)',
  },
  cardIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: borderRadius.md,
    flexShrink: 0,
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  cardDescription: {
    fontSize: '13px',
    color: colors.neutral500,
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
    flexDirection: 'column',
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
