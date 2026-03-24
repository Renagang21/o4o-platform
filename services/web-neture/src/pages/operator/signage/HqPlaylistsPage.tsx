/**
 * HqPlaylistsPage - HQ 재생목록 관리
 * 본사 재생목록 목록 조회 및 새 재생목록 등록
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListMusic,
  RefreshCw,
  Plus,
  ChevronRight,
  Loader2,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { api, API_BASE_URL } from '../../../lib/apiClient';

const SERVICE_KEY = 'neture';

type PlaylistStatus = 'draft' | 'pending' | 'active' | 'archived';

interface PlaylistItem {
  id: string;
  name: string;
  description?: string;
  status: PlaylistStatus;
  itemCount?: number;
  totalDuration?: number;
  createdAt: string;
  updatedAt?: string;
}

const statusConfig: Record<PlaylistStatus, { label: string; bg: string; text: string }> = {
  draft: { label: '초안', bg: 'bg-slate-100', text: 'text-slate-700' },
  pending: { label: '대기', bg: 'bg-amber-100', text: 'text-amber-700' },
  active: { label: '활성', bg: 'bg-green-100', text: 'text-green-700' },
  archived: { label: '아카이브', bg: 'bg-slate-100', text: 'text-slate-600' },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}분 ${secs}초`;
  return `${secs}초`;
}

export default function HqPlaylistsPage() {
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const loadPlaylists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`${API_BASE_URL}/api/signage/${SERVICE_KEY}/playlists?source=hq`);
      setPlaylists(data.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '재생목록을 불러오는데 실패했습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setIsSubmitting(true);
    try {
      const { data } = await api.post(`${API_BASE_URL}/api/signage/${SERVICE_KEY}/hq/playlists`, {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
      });
      if (data.data?.id) {
        setShowCreateForm(false);
        setFormName('');
        setFormDescription('');
        await loadPlaylists();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '재생목록 생성에 실패했습니다.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPlaylists = playlists.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Stats
  const totalCount = playlists.length;
  const activeCount = playlists.filter((p) => p.status === 'active').length;
  const pendingCount = playlists.filter((p) => p.status === 'pending').length;
  const archivedCount = playlists.filter((p) => p.status === 'archived').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <span className="ml-3 text-slate-600">재생목록 로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="mt-4 text-red-600">{error}</p>
        <button
          onClick={loadPlaylists}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ListMusic className="w-7 h-7 text-primary-600" />
            HQ 재생목록 관리
          </h1>
          <p className="text-slate-500 mt-1">본사 재생목록을 관리합니다</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadPlaylists}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 재생목록
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">전체</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{totalCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <p className="text-sm text-green-600">활성</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-sm text-amber-600">대기</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">아카이브</p>
          <p className="text-2xl font-bold text-slate-600 mt-1">{archivedCount}</p>
        </div>
      </div>

      {/* Create Form (toggle) */}
      {showCreateForm && (
        <div className="bg-white rounded-xl border border-primary-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">새 재생목록 등록</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">재생목록 이름</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="재생목록 이름을 입력하세요"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">설명 (선택)</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="재생목록에 대한 설명"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={isSubmitting || !formName.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              등록
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="재생목록 이름으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">이름</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">항목 수</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">총 재생시간</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">상태</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">생성일</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-slate-600" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPlaylists.map((item) => {
              const status = statusConfig[item.status];
              return (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/workspace/operator/signage/hq-playlists/${item.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{item.name}</div>
                    {item.description && (
                      <div className="text-sm text-slate-500 line-clamp-1">{item.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {item.itemCount != null ? `${item.itemCount}개` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {item.totalDuration != null ? formatDuration(item.totalDuration) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight className="w-5 h-5 text-slate-400 inline-block" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredPlaylists.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
              <ListMusic className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-slate-800">재생목록이 없습니다</h3>
            <p className="mt-2 text-slate-500">
              {searchQuery ? '검색 결과가 없습니다' : '새 재생목록을 등록해보세요'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
