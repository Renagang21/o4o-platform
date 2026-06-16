/**
 * OperatorForumAnalyticsPage — 포럼 운영 분석 (공통 콘솔, 조회 전용)
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-FORUM-ANALYTICS-COMMONIZE-V1
 *
 * KPI 카드 + 일별 트렌드 + 최근 활동. KPA/GlycoPharm/K-Cosmetics 공통.
 * 기존 3서비스 페이지의 구조/지표/데이터 접근을 그대로 보존하고, 서비스 차이(accent, API)만 props 로 주입.
 * mutation 없음 — 운영자가 지표를 조회하는 화면.
 *
 * Tailwind 주: 본 패키지(operator-core-ui)는 각 서비스 tailwind content 글롭에 포함되지 않으므로,
 * arbitrary-value 클래스(min-w-[28px]/text-[9px]/rotate-[-45deg])는 inline style 로 처리해 purge 회귀를 방지.
 * accent 색은 wrapper(서비스 소스)에서 리터럴 className 으로 주입되어 생성이 보장된다.
 */

import { useState, useEffect } from 'react';
import {
  BarChart3,
  MessageSquare,
  CheckCircle,
  Clock,
  Trash2,
  TrendingUp,
  Loader2,
  Activity,
} from 'lucide-react';
import type {
  ForumAnalyticsSummary,
  ForumAnalyticsTrendDay,
  ForumAnalyticsActivityItem,
  OperatorForumAnalyticsPageProps,
} from './types';

const statusLabel: Record<string, string> = {
  approved: '승인',
  rejected: '거절',
  revision_requested: '보완 요청',
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OperatorForumAnalyticsPage({
  client,
  accent,
  title = '포럼 분석',
  description = '포럼 운영 현황과 트렌드를 확인하세요',
}: OperatorForumAnalyticsPageProps) {
  const [summary, setSummary] = useState<ForumAnalyticsSummary | null>(null);
  const [trend, setTrend] = useState<ForumAnalyticsTrendDay[]>([]);
  const [activity, setActivity] = useState<ForumAnalyticsActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    const [s, t, a] = await Promise.all([
      client.getSummary(),
      client.getTrend(30),
      client.getActivity(15),
    ]);
    if (s?.data) setSummary(s.data as ForumAnalyticsSummary);
    const tData = t?.data as { daily?: ForumAnalyticsTrendDay[] } | null | undefined;
    if (tData?.daily) setTrend(tData.daily);
    if (Array.isArray(a?.data)) setActivity(a.data as ForumAnalyticsActivityItem[]);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`w-8 h-8 ${accent.iconText} animate-spin`} />
        <span className="ml-2 text-slate-600">로딩 중...</span>
      </div>
    );
  }

  const kpis = summary
    ? [
        { label: '총 포럼', value: summary.totalForums, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: '활성 포럼', value: summary.activeForums, icon: CheckCircle, color: accent.activeForumText, bg: accent.activeForumBg },
        { label: '총 게시글', value: summary.totalPosts, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: '신청 대기', value: summary.pendingRequests + summary.revisionRequests, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        { label: '승인 완료', value: summary.approvedRequests, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
        { label: '삭제 대기', value: summary.deleteRequestsPending, icon: Trash2, color: 'text-red-600', bg: 'bg-red-50' },
      ]
    : [];

  const maxRequests = Math.max(1, ...trend.map((d) => d.requests));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className={`w-7 h-7 ${accent.iconText}`} />
          {title}
        </h1>
        <p className="text-slate-500 mt-1">{description}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
            <p className="text-sm text-slate-500">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <TrendingUp className={`w-5 h-5 ${accent.iconText}`} />
          일별 신청 트렌드 (최근 30일)
        </h2>
        {trend.length === 0 ? (
          <div className="text-center py-8 text-slate-400">데이터가 없습니다</div>
        ) : (
          <div className="flex items-end gap-1 h-40 overflow-x-auto">
            {trend.map((day) => (
              <div key={day.date} className="flex flex-col items-center" style={{ minWidth: 28 }} title={`${day.date}: ${day.requests}건 신청, ${day.approved}건 승인`}>
                <div className="flex flex-col-reverse gap-px w-5">
                  <div
                    className={`${accent.barColor} rounded-t`}
                    style={{ height: `${(day.approved / maxRequests) * 120}px` }}
                  />
                  <div
                    className="bg-slate-300 rounded-t"
                    style={{ height: `${((day.requests - day.approved) / maxRequests) * 120}px` }}
                  />
                </div>
                <span
                  className="text-slate-400 mt-1 whitespace-nowrap"
                  style={{ fontSize: '9px', transform: 'rotate(-45deg)', transformOrigin: 'top left' }}
                >
                  {day.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className={`w-3 h-3 ${accent.barColor} rounded`} /> 승인</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-300 rounded" /> 기타</span>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <Activity className={`w-5 h-5 ${accent.iconText}`} />
          최근 활동
        </h2>
        {activity.length === 0 ? (
          <div className="text-center py-8 text-slate-400">최근 활동이 없습니다</div>
        ) : (
          <div className="space-y-3">
            {activity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  item.status === 'approved' ? 'bg-green-500' :
                  item.status === 'rejected' ? 'bg-red-500' : 'bg-orange-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">
                    <span className="font-medium">{item.name}</span>
                    {' — '}
                    <span className={
                      item.status === 'approved' ? 'text-green-600' :
                      item.status === 'rejected' ? 'text-red-600' : 'text-orange-600'
                    }>
                      {statusLabel[item.status] || item.status}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.requesterName} 신청 → {item.reviewerName || '운영자'} 검토
                    {item.reviewComment && ` · "${item.reviewComment}"`}
                  </p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {item.timestamp ? formatDate(item.timestamp) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
