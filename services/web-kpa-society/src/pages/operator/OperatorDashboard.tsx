/**
 * Operator Dashboard - KPA Society 운영자 대시보드
 *
 * 운영자 실사용 화면 1단계: APP-CONTENT / APP-SIGNAGE / APP-FORUM 통합 관제
 * "상태 파악 → 즉시 행동" — 3분 내 핵심 작업 완료
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Monitor,
  ListMusic,
  MessageSquarePlus,
  ChevronRight,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Image,
  Video,
  Globe,
  Bookmark,
} from 'lucide-react';
import { AiSummaryButton } from '../../components/ai';
import { operatorApi, type OperatorSummary } from '../../api/operator';

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-10">
      <AlertCircle size={40} className="mx-auto mb-4 text-slate-400" />
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

const mediaTypeIcon: Record<string, typeof Image> = {
  image: Image,
  video: Video,
  html: Globe,
  youtube: Video,
  vimeo: Video,
};

export default function OperatorDashboard() {
  const [summary, setSummary] = useState<OperatorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await operatorApi.getSummary();
      setSummary(response.data);
    } catch (err) {
      console.error('Failed to fetch operator dashboard data:', err);
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

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">운영자 대시보드</h1>
          <p className="text-slate-500 mt-1">APP-CONTENT / APP-SIGNAGE / APP-FORUM 통합 관제</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
          <AiSummaryButton contextLabel="운영자 대시보드 요약" />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stats Grid */}
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
                <span className="text-sm font-medium text-slate-500">콘텐츠</span>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{content?.totalPublished ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">게시 중</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">미디어</span>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{signage?.totalMedia ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">활성</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">플레이리스트</span>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <ListMusic className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{signage?.totalPlaylists ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">활성</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">포럼 게시글</span>
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <MessageSquarePlus className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{forum?.totalPosts ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">게시 중</p>
            </div>
          </>
        )}
      </div>

      {/* Two Column: Content + Forum */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">최근 콘텐츠</h2>
              </div>
              <Link
                to="signage/content"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                콘텐츠 허브 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          {loading ? (
            <div className="p-6 text-center text-slate-500">로딩 중...</div>
          ) : !content?.recentItems?.length ? (
            <EmptyState message="등록된 콘텐츠가 없습니다." />
          ) : (
            <div className="divide-y divide-slate-100">
              {content.recentItems.map((item) => (
                <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {item.isPinned && <Bookmark className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                        <p className="text-xs text-slate-400">{item.type}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                      {formatDate(item.publishedAt || item.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Forum Posts */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <MessageSquarePlus className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">최근 포럼 게시글</h2>
              </div>
              <Link
                to="forum-management"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                포럼 관리 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          {loading ? (
            <div className="p-6 text-center text-slate-500">로딩 중...</div>
          ) : !forum?.recentPosts?.length ? (
            <EmptyState message="등록된 게시글이 없습니다." />
          ) : (
            <div className="divide-y divide-slate-100">
              {forum.recentPosts.map((post) => (
                <div key={post.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{post.title}</p>
                      <p className="text-xs text-slate-400">
                        {post.authorName || '익명'} {post.categoryName ? `· ${post.categoryName}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                      {formatDate(post.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Signage Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Monitor className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">사이니지 미디어 & 플레이리스트</h2>
            </div>
            <Link
              to="signage/content"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              콘텐츠 허브 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        {loading ? (
          <div className="p-6 text-center text-slate-500">로딩 중...</div>
        ) : (!signage?.recentMedia?.length && !signage?.recentPlaylists?.length) ? (
          <EmptyState message="등록된 사이니지 콘텐츠가 없습니다." />
        ) : (
          <div className="p-6">
            {/* Media */}
            {signage?.recentMedia && signage.recentMedia.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-slate-500 mb-3">미디어</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {signage.recentMedia.map((media) => {
                    const IconComponent = mediaTypeIcon[media.mediaType] || Globe;
                    return (
                      <div key={media.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{media.name}</p>
                          <p className="text-xs text-slate-400">{media.mediaType}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Playlists */}
            {signage?.recentPlaylists && signage.recentPlaylists.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-3">플레이리스트</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {signage.recentPlaylists.map((playlist) => (
                    <div key={playlist.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ListMusic className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{playlist.name}</p>
                        <p className="text-xs text-slate-400">{playlist.itemCount}개 항목</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5 text-slate-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">빠른 작업</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '콘텐츠 허브', href: 'signage/content', icon: Monitor, color: 'purple' },
            { label: '포럼 관리', href: 'forum-management', icon: MessageSquarePlus, color: 'amber' },
            { label: 'AI 리포트', href: 'ai-report', icon: TrendingUp, color: 'blue' },
            { label: '약관 관리', href: 'legal', icon: FileText, color: 'slate' },
          ].map((action) => (
            <Link
              key={action.label}
              to={action.href}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <action.icon className={`w-5 h-5 text-${action.color}-600`} />
              <span className="font-medium text-slate-700">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
