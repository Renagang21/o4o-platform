/**
 * HqMediaPage - HQ 미디어 관리
 * 본사 미디어 목록 조회 및 새 미디어 등록
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Film,
  RefreshCw,
  Plus,
  Search,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { api, API_BASE_URL } from '../../../lib/apiClient';

const SERVICE_KEY = 'neture';

type MediaStatus = 'draft' | 'pending' | 'active' | 'archived';
type MediaType = 'video' | 'image' | 'html' | 'text';
type SourceType = 'url' | 'upload' | 'embed';

interface MediaItem {
  id: string;
  name: string;
  mediaType: MediaType;
  sourceType: SourceType;
  sourceUrl?: string;
  status: MediaStatus;
  createdAt: string;
  updatedAt?: string;
}

const statusConfig: Record<MediaStatus, { label: string; bg: string; text: string }> = {
  draft: { label: '초안', bg: 'bg-slate-100', text: 'text-slate-700' },
  pending: { label: '대기', bg: 'bg-amber-100', text: 'text-amber-700' },
  active: { label: '활성', bg: 'bg-green-100', text: 'text-green-700' },
  archived: { label: '아카이브', bg: 'bg-slate-100', text: 'text-slate-600' },
};

const mediaTypeLabels: Record<MediaType, string> = {
  video: '동영상',
  image: '이미지',
  html: 'HTML',
  text: '텍스트',
};

const sourceTypeLabels: Record<SourceType, string> = {
  url: 'URL',
  upload: '업로드',
  embed: '임베드',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function HqMediaPage() {
  const navigate = useNavigate();

  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formMediaType, setFormMediaType] = useState<MediaType>('video');
  const [formSourceType, setFormSourceType] = useState<SourceType>('url');
  const [formSourceUrl, setFormSourceUrl] = useState('');

  const loadMedia = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`${API_BASE_URL}/api/signage/${SERVICE_KEY}/media?source=hq`);
      setMediaList(data.data || []);
    } catch {
      // 401/403 등 권한 부족 시 빈 목록으로 처리
      setMediaList([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setIsSubmitting(true);
    try {
      const { data } = await api.post(`${API_BASE_URL}/api/signage/${SERVICE_KEY}/hq/media`, {
        name: formName.trim(),
        mediaType: formMediaType,
        sourceType: formSourceType,
        sourceUrl: formSourceUrl.trim() || undefined,
      });
      if (data.data?.id) {
        setShowCreateForm(false);
        setFormName('');
        setFormMediaType('video');
        setFormSourceType('url');
        setFormSourceUrl('');
        await loadMedia();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '미디어 생성에 실패했습니다.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMedia = mediaList.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Stats
  const totalCount = mediaList.length;
  const activeCount = mediaList.filter((m) => m.status === 'active').length;
  const pendingCount = mediaList.filter((m) => m.status === 'pending').length;
  const archivedCount = mediaList.filter((m) => m.status === 'archived').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <span className="ml-3 text-slate-600">미디어 목록 로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="mt-4 text-red-600">{error}</p>
        <button
          onClick={loadMedia}
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
            <Film className="w-7 h-7 text-primary-600" />
            HQ 미디어 관리
          </h1>
          <p className="text-slate-500 mt-1">본사 미디어 콘텐츠를 관리합니다</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadMedia}
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
            새 미디어
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
            <h2 className="text-lg font-semibold text-slate-800">새 미디어 등록</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">미디어 이름</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="미디어 이름을 입력하세요"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">미디어 타입</label>
              <select
                value={formMediaType}
                onChange={(e) => setFormMediaType(e.target.value as MediaType)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="video">동영상</option>
                <option value="image">이미지</option>
                <option value="html">HTML</option>
                <option value="text">텍스트</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">소스 타입</label>
              <select
                value={formSourceType}
                onChange={(e) => setFormSourceType(e.target.value as SourceType)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="url">URL</option>
                <option value="upload">업로드</option>
                <option value="embed">임베드</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">소스 URL</label>
              <input
                type="text"
                value={formSourceUrl}
                onChange={(e) => setFormSourceUrl(e.target.value)}
                placeholder="https://..."
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
          placeholder="미디어 이름으로 검색..."
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
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">타입</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">소스</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">상태</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">생성일</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-slate-600" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMedia.map((item) => {
              const status = statusConfig[item.status];
              return (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/workspace/operator/signage/hq-media/${item.id}`)}
                >
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-800">{item.name}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {mediaTypeLabels[item.mediaType] || item.mediaType}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {sourceTypeLabels[item.sourceType] || item.sourceType}
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

        {filteredMedia.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
              <Film className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-slate-800">미디어가 없습니다</h3>
            <p className="mt-2 text-slate-500">
              {searchQuery ? '검색 결과가 없습니다' : '새 미디어를 등록해보세요'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
