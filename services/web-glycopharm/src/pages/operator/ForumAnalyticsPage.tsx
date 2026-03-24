/**
 * ForumAnalyticsPage - 포럼 운영 분석
 *
 * WO-O4O-FORUM-ANALYTICS-UNIFICATION-V1
 * KPI 카드 + 트렌드 + 최근 활동 (GlycoPharm teal accent)
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
import { forumAnalyticsApi } from '@/services/api';

interface SummaryData {
  totalForums: number;
  activeForums: number;
  totalPosts: number;
  pendingRequests: number;
  revisionRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  deleteRequestsPending: number;
}

interface TrendDay {
  date: string;
  requests: number;
  approved: number;
  rejected: number;
}

interface ActivityItem {
  id: string;
  type: string;
  name: string;
  status: string;
  reviewerName: string | null;
  reviewComment: string | null;
  requesterName: string;
  timestamp: string;
}

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

export default function ForumAnalyticsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [trend, setTrend] = useState<TrendDay[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    const [s, t, a] = await Promise.all([
      forumAnalyticsApi.getSummary(),
      forumAnalyticsApi.getTrend(30),
      forumAnalyticsApi.getActivity(15),
    ]);
    if (s.data) setSummary(s.data as SummaryData);
    const tData = t.data as { daily?: TrendDay[] } | null;
    if (tData?.daily) setTrend(tData.daily);
    if (Array.isArray(a.data)) setActivity(a.data);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <span className="ml-2 text-slate-600">로딩 중...</span>
      </div>
    );
  }

  const kpis = summary
    ? [
        { label: '총 포럼', value: summary.totalForums, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: '활성 포럼', value: summary.activeForums, icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50' },
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
          <BarChart3 className="w-7 h-7 text-teal-600" />
          포럼 분석
        </h1>
        <p className="text-slate-500 mt-1">포럼 운영 현황과 트렌드를 확인하세요</p>
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
          <TrendingUp className="w-5 h-5 text-teal-600" />
          일별 신청 트렌드 (최근 30일)
        </h2>
        {trend.length === 0 ? (
          <div className="text-center py-8 text-slate-400">데이터가 없습니다</div>
        ) : (
          <div className="flex items-end gap-1 h-40 overflow-x-auto">
            {trend.map((day) => (
              <div key={day.date} className="flex flex-col items-center min-w-[28px]" title={`${day.date}: ${day.requests}건 신청, ${day.approved}건 승인`}>
                <div className="flex flex-col-reverse gap-px w-5">
                  <div
                    className="bg-teal-500 rounded-t"
                    style={{ height: `${(day.approved / maxRequests) * 120}px` }}
                  />
                  <div
                    className="bg-slate-300 rounded-t"
                    style={{ height: `${((day.requests - day.approved) / maxRequests) * 120}px` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 mt-1 rotate-[-45deg] origin-top-left whitespace-nowrap">
                  {day.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-teal-500 rounded" /> 승인</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-300 rounded" /> 기타</span>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-teal-600" />
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
