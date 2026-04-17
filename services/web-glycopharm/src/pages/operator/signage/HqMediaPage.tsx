/**
 * HQ Media Management Page — Signage Operator Console
 * WO-O4O-SIGNAGE-CONSOLE-V1 / WO-O4O-GLYCOPHARM-SIGNAGE-OPERATOR-UX-V1
 *
 * 개선: 검색(debounce) + 상태 필터 + URL 자동 프리뷰 + 사용 여부 컬럼
 * API: /api/signage/glycopharm/hq/media  (POST)
 *      /api/signage/glycopharm/media?source=hq (GET)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../../../lib/apiClient';
import {
  Film,
  RefreshCw,
  Plus,
  ChevronRight,
  Search,
  X,
  Youtube,
  Video,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

const SERVICE_KEY = 'glycopharm';
const BASE = `${API_BASE_URL}/api/signage/${SERVICE_KEY}`;

interface MediaItem {
  id: string;
  name: string;
  mediaType: string;
  sourceType: string;
  sourceUrl: string;
  embedId?: string;
  thumbnailUrl: string | null;
  status: string;
  createdAt: string;
  // 사용 여부 (API가 제공하면 사용, 아니면 별도 집계)
  usedInPlaylists?: number;
}

const STATUS_CONFIG: Record<string, { text: string; cls: string }> = {
  draft: { text: '초안', cls: 'bg-slate-100 text-slate-600' },
  pending: { text: '대기', cls: 'bg-amber-100 text-amber-700' },
  active: { text: '활성', cls: 'bg-green-100 text-green-700' },
  archived: { text: '아카이브', cls: 'bg-slate-200 text-slate-500' },
};

const STATUS_FILTERS = [
  { value: '', label: '전체' },
  { value: 'active', label: '활성' },
  { value: 'draft', label: '초안' },
  { value: 'pending', label: '대기' },
  { value: 'archived', label: '아카이브' },
];

// ── YouTube 비디오 ID 추출 ────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
  } catch {}
  return null;
}

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function isVimeoUrl(url: string): boolean {
  return url.includes('vimeo.com');
}

// ── URL 프리뷰 ────────────────────────────────────────────────────────────────
function UrlPreview({ url }: { url: string }) {
  if (!url.startsWith('http')) return null;

  if (isYouTubeUrl(url)) {
    const id = extractYouTubeId(url);
    if (!id) {
      return (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500">
          <AlertCircle className="w-3.5 h-3.5" /> 유효하지 않은 YouTube URL
        </div>
      );
    }
    return (
      <div className="mt-2">
        <div className="flex items-center gap-1.5 text-xs text-green-600 mb-1.5">
          <CheckCircle className="w-3.5 h-3.5" /> YouTube ID: {id}
        </div>
        <img
          src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
          alt="preview"
          className="w-48 h-28 object-cover rounded-lg border border-slate-200"
        />
      </div>
    );
  }

  if (isVimeoUrl(url)) {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-600">
        <CheckCircle className="w-3.5 h-3.5" /> Vimeo URL 확인됨
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
      <CheckCircle className="w-3.5 h-3.5" /> URL 입력됨
    </div>
  );
}

// ── 썸네일 셀 ─────────────────────────────────────────────────────────────────
function MediaThumbnail({ item }: { item: MediaItem }) {
  const url = item.sourceUrl || '';
  const id = item.embedId || extractYouTubeId(url);

  if (item.thumbnailUrl) {
    return <img src={item.thumbnailUrl} alt={item.name} className="w-16 h-10 object-cover rounded" />;
  }
  if (isYouTubeUrl(url) && id) {
    return (
      <img
        src={`https://img.youtube.com/vi/${id}/default.jpg`}
        alt={item.name}
        className="w-16 h-10 object-cover rounded"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="w-16 h-10 bg-slate-100 rounded flex items-center justify-center">
      {isYouTubeUrl(url) ? (
        <Youtube className="w-4 h-4 text-red-400" />
      ) : (
        <Video className="w-4 h-4 text-slate-300" />
      )}
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function HqMediaPage() {
  const navigate = useNavigate();

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // 검색 / 필터
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 생성 폼
  const [formName, setFormName] = useState('');
  const [formSourceType, setFormSourceType] = useState('youtube');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // 미디어→플레이리스트 사용 집계 (playlistId → mediaId 역인덱스)
  const [mediaUsageMap, setMediaUsageMap] = useState<Record<string, number>>({});

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const method = (options?.method || 'GET').toUpperCase();
    let body: any;
    if (options?.body && typeof options.body === 'string') {
      try { body = JSON.parse(options.body); } catch { body = options.body; }
    }
    const response = await api.request({ method, url: path, data: body });
    return response.data;
  }, []);

  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`${BASE}/media?source=hq&limit=200`);
      const items: MediaItem[] = data.data || data.items || data.media || [];
      setMedia(items);
    } catch (err: any) {
      setError('HQ 미디어를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  // 플레이리스트 items 기반 미디어 사용 집계
  const fetchUsage = useCallback(async () => {
    try {
      const data = await apiFetch(`${BASE}/playlists?source=hq&limit=200`);
      const playlists: any[] = data.data || data.items || data.playlists || [];
      const usageMap: Record<string, number> = {};
      for (const pl of playlists) {
        const items: any[] = pl.items ?? [];
        for (const item of items) {
          const mid = item.mediaId ?? item.media?.id;
          if (mid) usageMap[mid] = (usageMap[mid] ?? 0) + 1;
        }
      }
      setMediaUsageMap(usageMap);
    } catch {
      // 사용 집계 실패는 무시 (UI에서 '-' 표시)
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchMedia();
    fetchUsage();
  }, [fetchMedia, fetchUsage]);

  // 검색 debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // 필터링
  const filteredMedia = useMemo(() => {
    return media.filter((m) => {
      const matchSearch = !debouncedSearch || m.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchStatus = !statusFilter || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [media, debouncedSearch, statusFilter]);

  const stats = useMemo(() => ({
    total: media.length,
    active: media.filter((m) => m.status === 'active').length,
    pending: media.filter((m) => m.status === 'pending').length,
    draft: media.filter((m) => m.status === 'draft').length,
  }), [media]);

  const handleCreate = async () => {
    if (!formName.trim() || !formSourceUrl.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      await apiFetch(`${BASE}/hq/media`, {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          mediaType: 'video',
          sourceType: formSourceType,
          sourceUrl: formSourceUrl.trim(),
        }),
      });
      setFormName(''); setFormSourceUrl(''); setShowForm(false);
      fetchMedia();
      fetchUsage();
    } catch (err: any) {
      setError('미디어 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }); }
    catch { return '-'; }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Film className="w-6 h-6" /> HQ 미디어 관리
          </h1>
          <p className="text-slate-500 text-sm mt-1">운영자 제공 사이니지 미디어 콘텐츠</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> 새 미디어
          </button>
          <button
            onClick={() => { fetchMedia(); fetchUsage(); }}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '전체', value: stats.total, color: 'text-slate-800' },
          { label: '활성', value: stats.active, color: 'text-green-600' },
          { label: '대기', value: stats.pending, color: 'text-amber-600' },
          { label: '초안', value: stats.draft, color: 'text-slate-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-slate-100 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 생성 폼 */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">새 HQ 미디어 등록</h2>
            <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">제목 *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="미디어 제목"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">소스 타입</label>
              <select
                value={formSourceType}
                onChange={(e) => setFormSourceType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
                <option value="url">URL</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">소스 URL *</label>
              <input
                type="text"
                value={formSourceUrl}
                onChange={(e) => setFormSourceUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <UrlPreview url={formSourceUrl} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition-colors">취소</button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !formName.trim() || !formSourceUrl.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {isCreating ? '생성 중...' : '등록'}
            </button>
          </div>
        </div>
      )}

      {/* 검색 / 필터 */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="미디어 제목 검색..."
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 ml-auto">{filteredMedia.length}개</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {isLoading && media.length === 0 ? (
          <div className="space-y-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 animate-pulse">
                <div className="w-16 h-10 bg-slate-100 rounded flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-100 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/5" />
                </div>
                <div className="w-16 h-5 bg-slate-100 rounded" />
                <div className="w-16 h-5 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 w-20">미리보기</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">제목</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 hidden md:table-cell">소스</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">상태</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">사용 여부</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 hidden lg:table-cell">생성일</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMedia.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Film className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">
                      {search || statusFilter ? '검색 결과가 없습니다.' : 'HQ 미디어가 없습니다.'}
                    </p>
                    {!search && !statusFilter && (
                      <button
                        onClick={() => setShowForm(true)}
                        className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> 첫 미디어 등록
                      </button>
                    )}
                  </td>
                </tr>
              ) : filteredMedia.map((m) => {
                const sc = STATUS_CONFIG[m.status] ?? { text: m.status, cls: 'bg-slate-100 text-slate-600' };
                const usage = m.usedInPlaylists ?? mediaUsageMap[m.id];
                return (
                  <tr
                    key={m.id}
                    onClick={() => navigate(`/operator/signage/hq-media/${m.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <MediaThumbnail item={m} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 text-sm truncate max-w-xs">{m.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{m.sourceUrl}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                        {m.sourceType.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {usage != null ? (
                        usage > 0 ? (
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                            사용 중 ({usage})
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">미사용</span>
                        )
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">
                      {formatDate(m.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
