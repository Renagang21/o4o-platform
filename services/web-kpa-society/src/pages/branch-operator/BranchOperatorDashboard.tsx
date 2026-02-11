/**
 * BranchOperatorDashboard - 분회 운영자 대시보드
 *
 * WO-KPA-C-BRANCH-OPERATOR-DASHBOARD-UX-V1
 * "기능 나열"이 아닌 "운영 흐름 출발점"으로 설계
 *
 * 구조:
 *  [ Hero Summary ]     — 분회 상태 배지
 *  [ Action Signals ]   — 행동 유도 카드 3장
 *  [ Recent Activity ]  — 최근 운영 신호 5건
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquarePlus,
  Monitor,
  Users,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { operatorApi, type OperatorSummary } from '../../api/operator';

// ─── Signal types ───

type SignalStatus = 'good' | 'warning' | 'alert';

interface Signal {
  status: SignalStatus;
  message: string;
}

// ─── Signal derivation (pure functions) ───

function getOverallStatus(
  content: OperatorSummary['content'] | undefined,
  signage: OperatorSummary['signage'] | undefined,
  forum: OperatorSummary['forum'] | undefined,
): SignalStatus {
  const areas = [
    (content?.totalPublished || 0) > 0,
    (signage?.totalMedia || 0) > 0 || (signage?.totalPlaylists || 0) > 0,
    (forum?.totalPosts || 0) > 0,
  ];
  const active = areas.filter(Boolean).length;
  if (active === 3) return 'good';
  if (active >= 1) return 'warning';
  return 'alert';
}

function getForumSignal(forum: OperatorSummary['forum'] | undefined): Signal {
  if (!forum || forum.totalPosts === 0) {
    return { status: 'alert', message: '포럼 게시글 없음 — 초기 상태' };
  }
  if (!forum.recentPosts || forum.recentPosts.length === 0) {
    return { status: 'warning', message: `게시글 ${forum.totalPosts}개 · 최근 활동 없음` };
  }
  return { status: 'good', message: `게시글 ${forum.totalPosts}개 활성` };
}

function getContentSignal(
  content: OperatorSummary['content'] | undefined,
  signage: OperatorSummary['signage'] | undefined,
): Signal {
  const totalContent = content?.totalPublished || 0;
  const totalMedia = signage?.totalMedia || 0;
  const totalPlaylists = signage?.totalPlaylists || 0;

  if (totalContent === 0 && totalMedia === 0) {
    return { status: 'alert', message: '등록된 콘텐츠 없음' };
  }
  if (totalPlaylists === 0) {
    return { status: 'warning', message: `콘텐츠 ${totalContent}개 · 플레이리스트 미설정` };
  }
  return {
    status: 'good',
    message: `콘텐츠 ${totalContent}개 · 미디어 ${totalMedia}개 · 재생목록 ${totalPlaylists}개`,
  };
}

// ─── Status config ───

const STATUS_CONFIG: Record<
  SignalStatus,
  { label: string; color: string; bgColor: string; Icon: typeof CheckCircle }
> = {
  good: { label: '정상', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200', Icon: CheckCircle },
  warning: { label: '주의', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', Icon: AlertTriangle },
  alert: { label: '점검 필요', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', Icon: AlertCircle },
};

// ─── Helpers ───

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return '방금 전';
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface ActivityItem {
  id: string;
  type: 'content' | 'forum';
  title: string;
  detail: string;
  date: string;
}

function buildActivityFeed(s: OperatorSummary): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const c of s.content?.recentItems || []) {
    items.push({
      id: `c-${c.id}`,
      type: 'content',
      title: c.title,
      detail: c.type || '콘텐츠',
      date: c.publishedAt || c.createdAt,
    });
  }
  for (const p of s.forum?.recentPosts || []) {
    items.push({
      id: `f-${p.id}`,
      type: 'forum',
      title: p.title,
      detail: p.authorName || '익명',
      date: p.createdAt,
    });
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items.slice(0, 5);
}

// ─── Sub-components ───

function StatusDot({ label, status }: { label: string; status: SignalStatus }) {
  const dotColor: Record<SignalStatus, string> = {
    good: 'bg-green-500',
    warning: 'bg-amber-500',
    alert: 'bg-red-500',
  };
  const textColor: Record<SignalStatus, string> = {
    good: 'text-green-600',
    warning: 'text-amber-600',
    alert: 'text-red-600',
  };
  return (
    <span className={`flex items-center gap-1.5 ${textColor[status]}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor[status]}`} />
      {label}
    </span>
  );
}

function ActionSignalCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  signal,
  actionLabel,
  actionHref,
  loading,
}: {
  icon: typeof Monitor;
  iconBg: string;
  iconColor: string;
  title: string;
  signal: Signal;
  actionLabel: string;
  actionHref: string;
  loading: boolean;
}) {
  const signalBg: Record<SignalStatus, string> = {
    good: 'bg-green-50',
    warning: 'bg-amber-50',
    alert: 'bg-red-50',
  };
  const signalText: Record<SignalStatus, string> = {
    good: 'text-green-700',
    warning: 'text-amber-700',
    alert: 'text-red-700',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 animate-pulse">
        <div className="h-10 w-10 bg-slate-200 rounded-xl mb-4" />
        <div className="h-5 bg-slate-200 rounded w-24 mb-2" />
        <div className="h-4 bg-slate-200 rounded w-40 mb-4" />
        <div className="h-9 bg-slate-200 rounded w-full" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>

      <div className={`rounded-lg px-3 py-2 mb-4 ${signalBg[signal.status]}`}>
        <p className={`text-sm font-medium ${signalText[signal.status]}`}>{signal.message}</p>
      </div>

      <Link
        to={actionHref}
        className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors text-sm"
      >
        {actionLabel}
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ─── Main component ───

export function BranchOperatorDashboard() {
  const [summary, setSummary] = useState<OperatorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operatorApi.getSummary();
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch operator dashboard:', err);
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const content = summary?.content;
  const signage = summary?.signage;
  const forum = summary?.forum;

  const overall = summary ? getOverallStatus(content, signage, forum) : 'alert';
  const forumSignal = getForumSignal(forum);
  const contentSignal = getContentSignal(content, signage);
  const feed = summary ? buildActivityFeed(summary) : [];

  const HeroConfig = STATUS_CONFIG[overall];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">운영자 대시보드</h1>
          <p className="text-slate-500 mt-1">분회 운영 현황을 한눈에 확인하세요</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ═══ Hero Summary ═══ */}
      {loading && (
        <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-48 mb-2" />
          <div className="h-4 bg-slate-200 rounded w-64" />
        </div>
      )}

      {!loading && summary && (
        <div className={`rounded-2xl border p-5 ${HeroConfig.bgColor}`}>
          <div className="flex items-center gap-3">
            <HeroConfig.Icon className={`w-6 h-6 ${HeroConfig.color}`} />
            <div>
              <span className={`text-lg font-semibold ${HeroConfig.color}`}>
                분회 운영 상태: {HeroConfig.label}
              </span>
              <div className="flex gap-4 mt-1 text-sm">
                <StatusDot label="콘텐츠" status={contentSignal.status} />
                <StatusDot label="포럼" status={forumSignal.status} />
                <StatusDot
                  label="사이니지"
                  status={(signage?.totalMedia || 0) > 0 ? 'good' : 'alert'}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Action Signal Cards ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ActionSignalCard
          icon={MessageSquarePlus}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          title="포럼 구조"
          signal={forumSignal}
          actionLabel="포럼 관리"
          actionHref="forum-management"
          loading={loading}
        />
        <ActionSignalCard
          icon={Monitor}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          title="사이니지 콘텐츠"
          signal={contentSignal}
          actionLabel="콘텐츠 허브"
          actionHref="signage/content"
          loading={loading}
        />
        <ActionSignalCard
          icon={Users}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          title="운영자 계정"
          signal={{ status: 'good', message: '운영자 계정 관리' }}
          actionLabel="운영자 관리"
          actionHref="operators"
          loading={loading}
        />
      </div>

      {/* ═══ Recent Activity ═══ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">최근 운영 활동</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-500">로딩 중...</div>
        ) : feed.length === 0 ? (
          <div className="text-center py-10">
            <AlertCircle size={40} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-400 text-sm">최근 활동이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {feed.map((item) => (
              <div key={item.id} className="p-4 flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    item.type === 'content' ? 'bg-blue-50' : 'bg-amber-50'
                  }`}
                >
                  {item.type === 'content' ? (
                    <FileText className="w-4 h-4 text-blue-500" />
                  ) : (
                    <MessageSquarePlus className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.detail}</p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(item.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
