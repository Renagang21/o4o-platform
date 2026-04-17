/**
 * Signage Content Hub Page — Table UI
 *
 * WO-O4O-SIGNAGE-CONTENT-CENTERED-REFACTOR-V1
 *
 * 구조:
 *  - Media 중심 (Playlist 글로벌 노출 제거)
 *  - Table 기반 리스트 + 필터 (소스 / 키워드 / 카테고리)
 *  - 가져가기 (assetSnapshotApi.copy) 중심
 *  - 커뮤니티 등록 / 본인 콘텐츠 삭제 지원
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Search,
  AlertCircle,
  PlusCircle,
  X,
  ExternalLink,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Video as VideoIcon,
  Globe,
  Tag,
} from 'lucide-react';
import { publicContentApi, type ContentSource } from '../../lib/api/signageV2';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import { getAccessToken, useAuth } from '../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';
const PAGE_LIMIT = 20;

// ─── Types ─────────────────────────────────────────────

interface MediaItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  mediaType: string;
  url?: string;
  thumbnailUrl?: string;
  duration?: number;
  tags?: string[];
  source: string;
  createdByUserId?: string;
  createdAt: string;
  creatorName?: string;
}

// ─── Badges ────────────────────────────────────────────

const SOURCE_LABEL: Record<string, { label: string; cls: string }> = {
  hq:        { label: '운영자',  cls: 'bg-blue-100 text-blue-700' },
  community: { label: '커뮤니티', cls: 'bg-green-100 text-green-700' },
  supplier:  { label: '공급자',  cls: 'bg-amber-100 text-amber-700' },
};

const MEDIA_TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  youtube:   { label: 'YouTube', cls: 'bg-red-100 text-red-700' },
  video:     { label: '영상',    cls: 'bg-purple-100 text-purple-700' },
  image:     { label: '이미지',  cls: 'bg-sky-100 text-sky-700' },
  url:       { label: 'URL',     cls: 'bg-slate-100 text-slate-600' },
  html:      { label: 'HTML',    cls: 'bg-orange-100 text-orange-700' },
  text:      { label: '텍스트',  cls: 'bg-teal-100 text-teal-700' },
  rich_text: { label: 'Rich Text', cls: 'bg-teal-100 text-teal-700' },
};

function SourceBadge({ source }: { source: string }) {
  const cfg = SOURCE_LABEL[source] ?? { label: source, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const cfg = MEDIA_TYPE_LABEL[type] ?? { label: type, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Source tabs ───────────────────────────────────────

const SOURCE_TABS: { key: ContentSource | 'all'; label: string }[] = [
  { key: 'all',       label: '전체' },
  { key: 'hq',        label: '운영자 제공' },
  { key: 'community', label: '커뮤니티' },
  { key: 'supplier',  label: '공급자' },
];

// ─── Main Component ────────────────────────────────────

export default function ContentHubPage() {
  const { user } = useAuth();

  // Filter state
  const [source, setSource] = useState<ContentSource | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);

  // Category list
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Data
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createModal, setCreateModal] = useState<{ type: 'media' } | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', description: '', sourceUrl: '', category: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Debounce keyword
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleKeywordChange = (v: string) => {
    setKeyword(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedKeyword(v);
      setPage(1);
    }, 350);
  };

  // Source tab change resets page
  const handleSourceChange = (s: ContentSource | 'all') => {
    setSource(s);
    setPage(1);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setPage(1);
  };

  // Load media
  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const src = source === 'all' ? undefined : source;
      const res = await publicContentApi.listMedia(src, SERVICE_KEY, {
        page,
        limit: PAGE_LIMIT,
        search: debouncedKeyword || undefined,
        category: selectedCategory || undefined,
      });
      if (res.success && res.data) {
        setItems((res.data as any).items ?? []);
        setTotal((res.data as any).total ?? 0);
      } else {
        setError('콘텐츠를 불러오는 데 실패했습니다.');
      }
    } catch {
      setError('콘텐츠를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [source, page, debouncedKeyword, selectedCategory]);

  useEffect(() => { loadMedia(); }, [loadMedia]);

  // Load categories once
  useEffect(() => {
    fetch(`${API_BASE}/api/signage/${SERVICE_KEY}/categories`, {
      headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data) setCategories(json.data); })
      .catch(() => {});
  }, []);

  // ── Auth fetch helper ──
  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || body?.message || `API error ${res.status}`);
    }
    return res.json();
  }, []);

  // ── 가져가기 ──
  const handleTake = async (item: MediaItem) => {
    try {
      await assetSnapshotApi.copy({
        sourceService: 'kpa',
        sourceAssetId: item.id,
        assetType: 'signage',
      });
      showToast('내 콘텐츠에 추가되었습니다.', 'success');
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('DUPLICATE') || msg.includes('already')) {
        showToast('이미 가져간 콘텐츠입니다.', 'error');
      } else {
        showToast('가져오기에 실패했습니다.', 'error');
      }
    }
  };

  // ── Delete ──
  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/community/media/${deleteConfirm.id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      loadMedia();
      showToast('삭제되었습니다.', 'success');
    } catch (err: any) {
      showToast(err?.message || '삭제에 실패했습니다', 'error');
      setDeleteConfirm(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Community create ──
  const handleCreate = async () => {
    if (!createModal) return;
    if (!createForm.name.trim()) { setCreateError('제목을 입력하세요'); return; }
    if (!createForm.sourceUrl.trim()) { setCreateError('URL을 입력하세요'); return; }
    setIsCreating(true);
    setCreateError(null);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/community/media`, {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim() || undefined,
          sourceUrl: createForm.sourceUrl.trim(),
          category: createForm.category.trim() || undefined,
          mediaType: 'youtube',
        }),
      });
      setCreateModal(null);
      setCreateForm({ name: '', description: '', sourceUrl: '', category: '' });
      loadMedia();
      showToast('커뮤니티 콘텐츠가 등록되었습니다.', 'success');
    } catch (err: any) {
      setCreateError(err?.message || '등록에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">안내 영상 · 자료</h1>
          <p className="text-slate-500 mt-1 text-sm">
            약사회 및 커뮤니티에서 제공하는 안내·교육 영상을 탐색하고 내 매장에서 활용하세요
          </p>
        </div>
        {user && (
          <button
            onClick={() => { setCreateForm({ name: '', description: '', sourceUrl: '', category: '' }); setCreateError(null); setCreateModal({ type: 'media' }); }}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            콘텐츠 등록
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 rounded-lg p-3 text-sm border ${
          toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {toast.msg}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        {/* Source tabs */}
        <div className="flex flex-wrap gap-2">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleSourceChange(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                source === tab.key
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Keyword search + category */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
              placeholder="제목 또는 설명으로 검색..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
            />
          </div>
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="py-2 pl-3 pr-8 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
            >
              <option value="">전체 카테고리</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
            <VideoIcon className="h-4 w-4 text-purple-600" />
            콘텐츠 목록
          </h2>
          <span className="text-xs text-slate-400">총 {total.toLocaleString()}건</span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400 mt-2">불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-red-500 flex flex-col items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <VideoIcon className="h-8 w-8 text-slate-200" />
            <p>등록된 콘텐츠가 없습니다</p>
            {user && source === 'community' && (
              <button
                onClick={() => { setCreateForm({ name: '', description: '', sourceUrl: '', category: '' }); setCreateError(null); setCreateModal({ type: 'media' }); }}
                className="mt-1 text-blue-600 hover:underline"
              >
                첫 번째 커뮤니티 콘텐츠를 등록해보세요
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 w-auto">제목</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 w-24 hidden sm:table-cell">유형</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 w-24">출처</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 hidden md:table-cell">태그</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 w-28 hidden lg:table-cell">등록자</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 w-24 hidden lg:table-cell">등록일</th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-600 w-36">액션</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isOwn = !!user && item.source === 'community' && item.createdByUserId === user.id;
                  return (
                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      {/* 제목 */}
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0">
                            {item.url ? (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-slate-800 hover:text-blue-600 line-clamp-1 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {item.name}
                              </a>
                            ) : (
                              <span className="font-medium text-slate-800 line-clamp-1">{item.name}</span>
                            )}
                            {item.description && (
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.description}</p>
                            )}
                            {item.category && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                <Tag className="h-2.5 w-2.5" />{item.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* 유형 */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <TypeBadge type={item.mediaType} />
                      </td>
                      {/* 출처 */}
                      <td className="px-4 py-3">
                        <SourceBadge source={item.source} />
                      </td>
                      {/* 태그 */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {(item.tags ?? []).slice(0, 2).map((tag) => (
                            <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                          {(item.tags ?? []).length > 2 && (
                            <span className="text-[10px] text-slate-400">+{(item.tags ?? []).length - 2}</span>
                          )}
                        </div>
                      </td>
                      {/* 등록자 */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-slate-500 truncate block max-w-[100px]">{item.creatorName || '-'}</span>
                      </td>
                      {/* 등록일 */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </td>
                      {/* 액션 */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="새 창에서 보기"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          {user && (
                            <button
                              onClick={() => handleTake(item)}
                              className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="가져가기"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          {isOwn && (
                            <button
                              onClick={() => setDeleteConfirm({ id: item.id, name: item.name })}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              {page} / {totalPages} 페이지
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Community link info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <Globe className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-0.5">가져가기 안내</p>
          <p className="text-blue-600">
            콘텐츠를 <strong>가져가기</strong>하면 내 매장 콘텐츠 보관함에 독립적으로 저장됩니다.
            원본이 변경되어도 영향 없으며, 매장에서 직접 수정·삭제 가능합니다.
          </p>
        </div>
      </div>

      {/* Community Content Creation Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">커뮤니티 콘텐츠 등록</h3>
              <button onClick={() => setCreateModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">제목 *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="예: 약사회 건강 안내 영상"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">YouTube URL *</label>
                <input
                  type="url"
                  value={createForm.sourceUrl}
                  onChange={(e) => setCreateForm(f => ({ ...f, sourceUrl: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">카테고리 (선택)</label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
                >
                  <option value="">카테고리 선택</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">설명 (선택)</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="간단한 설명을 입력하세요"
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
                />
              </div>
              {createError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{createError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setCreateModal(null)}
                disabled={isCreating}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreating ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-slate-800 mb-2">콘텐츠 삭제</h3>
            <p className="text-sm text-slate-500 mb-3">삭제하면 커뮤니티에서 더 이상 표시되지 않습니다.</p>
            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-slate-700 truncate">{deleteConfirm.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">내가 등록한 커뮤니티 콘텐츠</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
