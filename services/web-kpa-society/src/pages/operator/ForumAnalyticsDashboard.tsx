/**
 * ForumAnalyticsDashboard - 포럼 운영 통계 대시보드
 *
 * KPI 4개: 전체 포럼 / 7일 활성 / 7일 게시글 / 7일 댓글
 * Top 5 활성 포럼 (30일)
 * 30일 무활동 포럼 목록
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Users,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { operatorApi, type ForumAnalytics } from '../../api/operator';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '활동 없음';
  const date = new Date(dateStr);
  const now = Date.now();
  const diffDays = Math.floor((now - date.getTime()) / 86400000);
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

export default function ForumAnalyticsDashboard() {
  const [data, setData] = useState<ForumAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await operatorApi.getForumAnalytics();
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch forum analytics:', err);
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">포럼 통계</h1>
          <p className="text-slate-500 mt-1">포럼 활동 현황 및 운영 지표</p>
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

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-20 mb-3" />
              <div className="h-8 bg-slate-200 rounded w-12" />
            </div>
          ))
        ) : (
          <>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">전체 포럼</span>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{data?.totalForums ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">활성 카테고리</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">7일 활성</span>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{data?.activeForums7d ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">최근 7일 활동 포럼</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">7일 게시글</span>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{data?.posts7d ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">최근 7일 신규 게시글</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">7일 댓글</span>
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-orange-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{data?.comments7d ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">최근 7일 신규 댓글</p>
            </div>
          </>
        )}
      </div>

      {/* Two-column layout: Top 5 + Inactive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Active Forums */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">활동 Top 5</h2>
            <span className="text-xs text-slate-400">최근 30일</span>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : !data?.topForums?.length ? (
            <div className="text-center py-10">
              <AlertCircle size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-400 text-sm">활동 데이터가 없습니다</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-50">
                  <th className="text-left px-6 py-3 font-medium">#</th>
                  <th className="text-left px-3 py-3 font-medium">포럼</th>
                  <th className="text-right px-3 py-3 font-medium">게시글</th>
                  <th className="text-right px-3 py-3 font-medium">댓글</th>
                  <th className="text-right px-6 py-3 font-medium">합계</th>
                </tr>
              </thead>
              <tbody>
                {data.topForums.map((forum, idx) => (
                  <tr key={forum.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm font-medium text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <Link to={`/forum/all?category=${forum.id}`} className="text-sm font-medium text-slate-700 hover:text-blue-600">
                        {forum.iconEmoji && <span className="mr-1">{forum.iconEmoji}</span>}
                        {forum.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-slate-600">{forum.posts30d}</td>
                    <td className="px-3 py-3 text-right text-sm text-slate-600">{forum.comments30d}</td>
                    <td className="px-6 py-3 text-right text-sm font-semibold text-blue-600">{forum.activityScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Inactive Forums */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-800">무활동 포럼</h2>
              {data && data.inactiveForums30d.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {data.inactiveForums30d.length}개
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400">30일 이상 게시글 없음</span>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : !data?.inactiveForums30d?.length ? (
            <div className="text-center py-10">
              <TrendingUp size={32} className="mx-auto mb-3 text-green-300" />
              <p className="text-green-500 text-sm">모든 포럼이 활동 중입니다</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {data.inactiveForums30d.map((forum) => (
                <li key={forum.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                  <Link to={`/forum/all?category=${forum.id}`} className="text-sm font-medium text-slate-700 hover:text-blue-600">
                    <AlertTriangle size={14} className="inline mr-1.5 text-amber-400" />
                    {forum.iconEmoji && <span className="mr-1">{forum.iconEmoji}</span>}
                    {forum.name}
                  </Link>
                  <span className="text-xs text-slate-400">{formatDate(forum.lastActivityAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
