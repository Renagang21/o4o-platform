/**
 * OperatorContentHubConsole — 운영자 콘텐츠 허브 공통 View
 *
 * WO-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1
 *
 * KPA `pages/operator/OperatorContentHubPage` 를 canonical 로 승격.
 * GlycoPharm 의 동일 화면(KPA 포팅본 · VIEW_DUPLICATED)이 이 View 를 소비한다.
 *
 * 계약:
 *   - fetch/axios 직접 호출 없음 (ContentHubClient adapter 주입).
 *   - service 조건문 없음 — status enum/카테고리/편집기/상세이동은 config·slot.
 *   - 상태 계약 보존: loading / error / empty / populated.
 *   - 정책(노출·추천·가시성)을 View 가 결정하지 않는다.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Search, RefreshCw, Pencil, Trash2, Tag,
  FileText, ChevronRight, Loader2, AlertCircle,
} from 'lucide-react';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { toast } from '@o4o/error-handling';
import { ConfirmActionDialog } from '@o4o/ui';
import { RichTextEditor, isBlankHtml } from '@o4o/content-editor';
import type {
  OperatorContentHubConsoleProps,
  ContentHubItem,
  ContentHubStatusOption,
} from './types';

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const SOURCE_LABEL: Record<string, string> = {
  upload: '파일',
  external: '링크',
  manual: '직접 입력',
};

const TONE_CLASS: Record<'green' | 'amber' | 'slate', string> = {
  green: 'text-green-600',
  amber: 'text-amber-500',
  slate: 'text-slate-600',
};

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return '-';
  }
}

export function OperatorContentHubConsole({
  client,
  tableId,
  title = '콘텐츠 허브 관리',
  subtitle = '재사용 가능한 콘텐츠를 구조화하여 관리합니다',
  statusOptions,
  defaultStatus,
  allStatusValue = '',
  allStatusLabel = '전체 상태',
  statCards = [],
  categoryOptions,
  bodyEditor = 'plain',
  editorPlaceholder = '콘텐츠 본문',
  requireBodyForManual = false,
  onOpenItem,
  createButtonLabel = '콘텐츠 등록',
  headerActions,
}: OperatorContentHubConsoleProps) {
  const [items, setItems] = useState<ContentHubItem[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(allStatusValue);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentHubItem | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    summary: '',
    category: '',
    tags: '',
    status: defaultStatus,
    source_type: 'manual',
    source_url: '',
    body: '',
  });

  const statusMap = useMemo(() => {
    const map: Record<string, ContentHubStatusOption> = {};
    statusOptions.forEach((o) => { map[o.value] = o; });
    return map;
  }, [statusOptions]);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await client.list({
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
      });
      setItems(result.items ?? []);
      setPagination({
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (e: any) {
      setError(e?.message || '콘텐츠를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [client, currentPage, searchTerm, categoryFilter, statusFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSearch = () => { setSearchTerm(searchInput); setCurrentPage(1); };

  const confirmDelete = async () => {
    const item = deleteTarget;
    if (!item) return;
    setDeleting(item.id);
    try {
      await client.remove(item.id);
      toast.success('삭제되었습니다');
      await fetchItems();
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      title: '', summary: '', category: '', tags: '',
      status: defaultStatus, source_type: 'manual', source_url: '', body: '',
    });
    setShowModal(true);
  };

  const openEdit = async (item: ContentHubItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      summary: item.summary || '',
      category: item.category || '',
      tags: (item.tags || []).join(', '),
      status: item.status,
      source_type: item.source_type || 'manual',
      source_url: '',
      body: '',
    });
    setShowModal(true);
    if (!client.get) return;
    // 본문(body)은 목록 응답에 없으므로 상세 조회로 prefill
    setEditLoading(true);
    try {
      const detail = await client.get(item.id);
      setForm((f) => ({
        ...f,
        body: detail?.body || '',
        source_url: detail?.source_url || '',
      }));
    } catch {
      /* prefill 실패 시 빈 본문으로 편집 시작 */
    } finally {
      setEditLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('제목은 필수입니다'); return; }

    // O4O Tag Policy V1 — sanitize + 최소 1개 필수
    const sanitizedTags = [...new Set(
      form.tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean).filter((t) => t.length <= 30),
    )];
    if (sanitizedTags.length === 0) { toast.error('태그를 1개 이상 입력해주세요'); return; }

    const normalizedBody = bodyEditor === 'rich'
      ? (isBlankHtml(form.body) ? null : form.body)
      : (form.body || null);
    if (requireBodyForManual && form.source_type === 'manual' && !normalizedBody) {
      toast.error('내용이 없습니다. 본문을 입력해주세요');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        summary: form.summary || null,
        category: form.category || null,
        tags: sanitizedTags,
        status: form.status,
        source_type: form.source_type,
        source_url: form.source_url || null,
        body: normalizedBody,
      };
      if (editingId) {
        await client.update(editingId, payload);
        toast.success('수정되었습니다');
      } else {
        await client.create(payload);
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

  const handleUploadImage = async (file: File): Promise<string> => {
    if (!client.uploadImage) throw new Error('이미지 업로드를 지원하지 않습니다.');
    return client.uploadImage(file);
  };

  const contentColumns: ListColumnDef<ContentHubItem>[] = [
    {
      key: 'title',
      header: '제목',
      width: '34%',
      render: (_v, item) => (
        <button
          onClick={() => (onOpenItem ? onOpenItem(item) : openEdit(item))}
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
      ),
    },
    {
      key: 'category_tags',
      header: '카테고리 / 태그',
      width: '18%',
      render: (_v, item) => (
        <>
          {item.category && (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 mb-1">{item.category}</span>
          )}
          {(item.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((t) => (
                <span key={t} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600">
                  <Tag className="w-2.5 h-2.5" />{t}
                </span>
              ))}
              {item.tags.length > 3 && <span className="text-xs text-slate-400">+{item.tags.length - 3}</span>}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'source_type',
      header: '유형',
      width: '8%',
      align: 'center',
      render: (_v, item) => (
        <span className="text-xs text-slate-500">{SOURCE_LABEL[item.source_type] || item.source_type}</span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '8%',
      align: 'center',
      render: (_v, item) => {
        const badge = statusMap[item.status];
        return badge
          ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.badgeClass}`}>{badge.label}</span>
          : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{item.status}</span>;
      },
    },
    {
      key: 'created_at',
      header: '등록일',
      width: '10%',
      sortable: true,
      sortAccessor: (item) => new Date(item.created_at).getTime(),
      render: (_v, item) => <span className="text-sm text-slate-500">{formatDate(item.created_at)}</span>,
    },
    {
      key: '_actions',
      header: '액션',
      width: '22%',
      align: 'right',
      render: (_v, item) => {
        const isDeleting = deleting === item.id;
        return (
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => openEdit(item)} title="수정" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeleteTarget(item)}
              disabled={isDeleting}
              title="삭제"
              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-40"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        );
      },
    },
  ];

  const currentStatusHint = statusMap[form.status]?.formHint;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
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
          {headerActions}
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {createButtonLabel}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={`grid gap-4 ${statCards.length >= 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-800">{pagination.total}</p>
          <p className="text-xs text-slate-500">전체 콘텐츠</p>
        </div>
        {statCards.map((card) => (
          <div key={card.status} className="bg-white rounded-xl p-4 border border-slate-100">
            <p className={`text-2xl font-bold ${TONE_CLASS[card.tone]}`}>
              {items.filter((i) => i.status === card.status).length}
            </p>
            <p className="text-xs text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button
            onClick={fetchItems}
            className="ml-auto px-3 py-1 text-xs text-red-600 border border-red-300 rounded-lg hover:bg-red-100"
          >
            다시 시도
          </button>
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
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          {categoryOptions && categoryOptions.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 카테고리</option>
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={allStatusValue}>{allStatusLabel}</option>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.formLabel || o.label}</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm font-medium"
          >
            검색
          </button>
        </div>

        {/* DataTable — canonical @o4o/operator-ux-core */}
        <DataTable<ContentHubItem>
          columns={contentColumns}
          data={items}
          rowKey="id"
          loading={isLoading}
          emptyMessage={
            <span>
              등록된 콘텐츠가 없습니다.
              <button onClick={openCreate} className="ml-2 text-blue-500 underline">첫 콘텐츠 등록</button>
            </span>
          }
          tableId={tableId}
        />

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
              }).filter((p) => p <= pagination.totalPages).map((p) => (
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
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="콘텐츠 제목"
                />
              </div>
              {/* 요약 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">요약</label>
                <textarea
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="콘텐츠 요약"
                />
              </div>
              {/* 카테고리 + 상태 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">카테고리</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="카테고리"
                    list={categoryOptions && categoryOptions.length > 0 ? `${tableId}-category-suggestions` : undefined}
                  />
                  {categoryOptions && categoryOptions.length > 0 && (
                    <datalist id={`${tableId}-category-suggestions`}>
                      {categoryOptions.map((c) => <option key={c} value={c} />)}
                    </datalist>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">상태</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.formLabel || o.label}</option>
                    ))}
                  </select>
                  {currentStatusHint && (
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{currentStatusHint}</p>
                  )}
                </div>
              </div>
              {/* 태그 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">태그 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="쉼표로 구분: 약가, 급여, 청구 ..."
                />
              </div>
              {/* 원본 유형 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">원본 유형</label>
                <select
                  value={form.source_type}
                  onChange={(e) => setForm((f) => ({ ...f, source_type: e.target.value }))}
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
                    onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
              )}
              {/* 본문 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">본문</label>
                {editLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400 border border-slate-200 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" /> 본문 불러오는 중…
                  </div>
                ) : bodyEditor === 'rich' ? (
                  <RichTextEditor
                    value={form.body}
                    onChange={(c) => setForm((f) => ({ ...f, body: c.html }))}
                    onImageUpload={handleUploadImage}
                    placeholder={editorPlaceholder}
                    minHeight="320px"
                    preset="full"
                  />
                ) : (
                  <textarea
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                    rows={5}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder={editorPlaceholder}
                  />
                )}
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

      <ConfirmActionDialog
        open={!!deleteTarget}
        title="콘텐츠 삭제"
        message={deleteTarget ? `"${deleteTarget.title}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.` : ''}
        variant="danger"
        confirmText="삭제"
        loading={!!deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
