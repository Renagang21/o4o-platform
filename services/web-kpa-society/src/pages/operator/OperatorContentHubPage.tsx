/**
 * OperatorContentHubPage — 콘텐츠 정리 허브
 *
 * WO-O4O-KPA-CONTENT-HUB-FOUNDATION-V1
 *
 * 기존 OperatorDocsPage(파일 저장소 구조)를 대체하는
 * Block 기반 콘텐츠 허브. O4O DataTable 패턴 준수.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, RefreshCw, Pencil, Trash2, Copy, Tag,
  FileText, ChevronRight, Loader2, AlertCircle,
} from 'lucide-react';
import { getAccessToken } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContentItem {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  tags: string[];
  status: 'draft' | 'ready';
  source_type: string;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── API helper ───────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message || body?.error || `API error ${res.status}`);
  return body;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: '초안', cls: 'bg-amber-100 text-amber-700' },
  ready: { label: '완료', cls: 'bg-green-100 text-green-700' },
};

const SOURCE_LABEL: Record<string, string> = {
  upload: '파일',
  external: '링크',
  manual: '직접 입력',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function OperatorContentHubPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copying, setCopying] = useState<string | null>(null);

  // ─── Modal: 등록/수정 ──────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    summary: '',
    category: '',
    tags: '',        // comma-separated → string[]
    status: 'draft' as 'draft' | 'ready',
    source_type: 'manual' as 'manual' | 'upload' | 'external',
    source_url: '',
    blocks: '[]',   // JSON string
  });

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
      if (searchTerm) params.set('search', searchTerm);
      if (categoryFilter) params.set('category', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);

      const data = await apiFetch<{ success: boolean; data: { items: ContentItem[]; total: number; page: number; limit: number; totalPages: number } }>(
        `/api/v1/kpa/contents?${params}`
      );
      if (data.success) {
        setItems(data.data.items);
        setPagination({ page: data.data.page, limit: data.data.limit, total: data.data.total, totalPages: data.data.totalPages });
      }
    } catch (e: any) {
      setError(e?.message || '콘텐츠를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, categoryFilter, statusFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSearch = () => { setSearchTerm(searchInput); setCurrentPage(1); };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (item: ContentItem) => {
    if (!window.confirm(`"${item.title}"을 삭제하시겠습니까?`)) return;
    setDeleting(item.id);
    try {
      await apiFetch(`/api/v1/kpa/contents/${item.id}`, { method: 'DELETE' });
      toast.success('삭제되었습니다');
      await fetchItems();
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    } finally {
      setDeleting(null);
    }
  };

  // ─── Copy to Store ────────────────────────────────────────────────────────
  const handleCopyToStore = async (item: ContentItem) => {
    setCopying(item.id);
    try {
      await apiFetch(`/api/v1/kpa/contents/${item.id}/copy-to-store`, { method: 'POST', body: '{}' });
      toast.success('내 공간에 복사되었습니다');
    } catch (e: any) {
      toast.error(e?.message || '복사에 실패했습니다');
    } finally {
      setCopying(null);
    }
  };

  // ─── Modal helpers ────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm({ title: '', summary: '', category: '', tags: '', status: 'draft', source_type: 'manual', source_url: '', blocks: '[]' });
    setShowModal(true);
  };

  const openEdit = (item: ContentItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      summary: item.summary || '',
      category: item.category || '',
      tags: (item.tags || []).join(', '),
      status: item.status,
      source_type: (item.source_type as any) || 'manual',
      source_url: '',
      blocks: '[]',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('제목은 필수입니다'); return; }
    setSaving(true);
    try {
      let parsedBlocks: object[] = [];
      try { parsedBlocks = JSON.parse(form.blocks); } catch { parsedBlocks = []; }

      const payload = {
        title: form.title.trim(),
        summary: form.summary || null,
        category: form.category || null,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        status: form.status,
        source_type: form.source_type,
        source_url: form.source_url || null,
        blocks: parsedBlocks,
      };

      if (editingId) {
        await apiFetch(`/api/v1/kpa/contents/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        toast.success('수정되었습니다');
      } else {
        await apiFetch('/api/v1/kpa/contents', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('등록되었습니다');
      }
      setShowModal(false);
      await fetchItems();
    } catch (e: any) {
      toast.error(e?.message || '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch { return '-'; }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">콘텐츠 허브</h1>
          <p className="text-slate-500 text-sm mt-1">재사용 가능한 콘텐츠를 구조화하여 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchItems}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            콘텐츠 등록
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-800">{pagination.total}</p>
          <p className="text-xs text-slate-500">전체 콘텐츠</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-green-600">{items.filter(i => i.status === 'ready').length}</p>
          <p className="text-xs text-slate-500">완료 (현재 페이지)</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-amber-500">{items.filter(i => i.status === 'draft').length}</p>
          <p className="text-xs text-slate-500">초안 (현재 페이지)</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">

        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="제목/요약 검색..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 카테고리</option>
            <option value="약국경영">약국경영</option>
            <option value="법령/규정">법령/규정</option>
            <option value="마케팅">마케팅</option>
            <option value="교육">교육</option>
            <option value="공지">공지</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 상태</option>
            <option value="draft">초안</option>
            <option value="ready">완료</option>
          </select>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm font-medium"
          >
            검색
          </button>
        </div>

        {/* Loading */}
        {isLoading && items.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        )}

        {/* DataTable */}
        {(!isLoading || items.length > 0) && (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 w-[34%]">제목</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 w-[18%]">카테고리 / 태그</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 w-[8%]">유형</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 w-[8%]">상태</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 w-[10%]">등록일</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 w-[22%]">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                    등록된 콘텐츠가 없습니다.
                    <button onClick={openCreate} className="ml-2 text-blue-500 underline">첫 콘텐츠 등록</button>
                  </td>
                </tr>
              ) : (
                items.map(item => {
                  const badge = STATUS_BADGE[item.status] || STATUS_BADGE.draft;
                  const isDeleting = deleting === item.id;
                  const isCopying = copying === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      {/* 제목 */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/operator/content-hub/${item.id}`)}
                          className="text-left group w-full"
                        >
                          <p className="font-medium text-sm text-slate-800 group-hover:text-blue-600 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            {item.title}
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 ml-auto" />
                          </p>
                          {item.summary && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{item.summary}</p>
                          )}
                        </button>
                      </td>
                      {/* 카테고리/태그 */}
                      <td className="px-4 py-3">
                        {item.category && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 mb-1">{item.category}</span>
                        )}
                        {(item.tags || []).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.slice(0, 3).map(t => (
                              <span key={t} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600">
                                <Tag className="w-2.5 h-2.5" />{t}
                              </span>
                            ))}
                            {item.tags.length > 3 && <span className="text-xs text-slate-400">+{item.tags.length - 3}</span>}
                          </div>
                        )}
                      </td>
                      {/* 유형 */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-slate-500">{SOURCE_LABEL[item.source_type] || item.source_type}</span>
                      </td>
                      {/* 상태 */}
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                      </td>
                      {/* 등록일 */}
                      <td className="px-4 py-3 text-sm text-slate-500">{formatDate(item.created_at)}</td>
                      {/* 액션 */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleCopyToStore(item)}
                            disabled={isCopying}
                            title="내 공간에 복사"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 disabled:opacity-40"
                          >
                            {isCopying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => openEdit(item)}
                            title="수정"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={isDeleting}
                            title="삭제"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-40"
                          >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              총 {pagination.total}개 중 {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}개
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(currentPage - 2, pagination.totalPages - 4));
                return start + i;
              }).filter(p => p <= pagination.totalPages).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === p ? 'bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage === pagination.totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 등록/수정 Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">{editingId ? '콘텐츠 수정' : '콘텐츠 등록'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">제목 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="콘텐츠 제목"
                />
              </div>
              {/* 요약 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">요약</label>
                <textarea
                  value={form.summary}
                  onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="콘텐츠 요약 (AI 생성 또는 직접 입력)"
                />
              </div>
              {/* 카테고리 + 상태 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">카테고리</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="약국경영, 법령/규정 등"
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    <option value="약국경영" />
                    <option value="법령/규정" />
                    <option value="마케팅" />
                    <option value="교육" />
                    <option value="공지" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">상태</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as 'draft' | 'ready' }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">초안</option>
                    <option value="ready">완료</option>
                  </select>
                </div>
              </div>
              {/* 태그 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">태그</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="쉼표로 구분: 약가, 급여, 청구 ..."
                />
              </div>
              {/* 원본 유형 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">원본 유형</label>
                <select
                  value={form.source_type}
                  onChange={e => setForm(f => ({ ...f, source_type: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="manual">직접 입력</option>
                  <option value="external">외부 링크</option>
                  <option value="upload">파일 업로드</option>
                </select>
              </div>
              {/* 외부 링크 */}
              {form.source_type === 'external' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">외부 링크 URL</label>
                  <input
                    type="url"
                    value={form.source_url}
                    onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
              )}
              {/* Block 콘텐츠 (JSON) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  콘텐츠 블록 <span className="text-slate-400 text-xs font-normal">(JSON)</span>
                </label>
                <textarea
                  value={form.blocks}
                  onChange={e => setForm(f => ({ ...f, blocks: e.target.value }))}
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder={`[\n  {"type": "text", "content": "내용..."},\n  {"type": "list", "items": ["항목1", "항목2"]}\n]`}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm font-medium disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? '저장' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
