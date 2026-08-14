/**
 * HqMediaPage — 운영자 사이니지 HQ 미디어 목록 (공통 콘솔)
 *
 * WO-O4O-SIGNAGE-CONSOLE-V1 (원본)
 * WO-KPA-SIGNAGE-UI-RESTRUCTURE-V1: 검색바 + DataTable 전환
 * WO-O4O-SIGNAGE-TABLE-STANDARD-V1: O4O 표준 테이블 (체크 선택 + bulk delete + RowActionMenu)
 * WO-O4O-KPA-SIGNAGE-VIDEO-PLAYLIST-MODAL-V1: 인라인 등록 폼 → 모달
 * WO-O4O-KPA-SIGNAGE-MEDIA-USAGE-GUARD-AND-SAFE-DELETE-V1: 사용처 선조회 삭제 게이트
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1:
 *   KPA/K-Cosmetics 중복을 단일 콘솔로 수렴. 서비스는 apiFetch + config 만 주입.
 *   K-Cosmetics 는 이 수렴으로 표준 테이블·일괄 삭제·삭제 안전 게이트를 획득한다
 *   (endpoint 는 backend 가 `:serviceKey` 파라미터화돼 있어 그대로다).
 *
 * API: GET  /api/signage/:serviceKey/media?source=hq
 *      POST /api/signage/:serviceKey/hq/media
 *      DEL  /api/signage/:serviceKey/hq/media/:id
 */

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { Film, RefreshCw, Plus, Trash2, Search, Eye } from 'lucide-react';
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
import { DataTable, useBatchAction, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { MediaDeleteDialog } from './MediaDeleteDialog';
import {
  SIGNAGE_STATUS_CONFIG,
  SIGNAGE_MEDIA_TYPE_LABEL,
  SIGNAGE_SOURCE_TYPE_LABEL,
  type SignageMediaItem,
  type SignageHqPageProps,
} from './types';

const MEDIA_ACTION_ICONS: Record<string, ReactNode> = {
  view: <Eye className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return '-';
  }
}

function parseDuration(input: string): number {
  const parts = input.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export function HqMediaPage({ apiFetch, config, navigate }: SignageHqPageProps) {
  const { serviceKey, accent, tagSuggestions, routeBase } = config;

  const [media, setMedia] = useState<SignageMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<SignageMediaItem | null>(null);
  const batch = useBatchAction();

  // Create form
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSourceType, setFormSourceType] = useState('url');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formDuration, setFormDuration] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formTagInput, setFormTagInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const mediaActionPolicy = useMemo(
    () => defineActionPolicy<SignageMediaItem>(`${config.actionPolicyPrefix}:hq-media`, {
      rules: [
        { key: 'view', label: '상세 보기' },
        {
          key: 'delete',
          label: '삭제',
          variant: 'danger',
          divider: true,
          // 정적 confirm 대신 사용처 선조회 다이얼로그(MediaDeleteDialog)로 처리한다.
        },
      ],
    }),
    [config.actionPolicyPrefix],
  );

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormSourceUrl('');
    setFormSourceType('url');
    setFormDuration('');
    setFormTags([]);
    setFormTagInput('');
    setFormError(null);
  };

  // ESC to close modal
  useEffect(() => {
    if (!showForm) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCreating) { setShowForm(false); resetForm(); }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showForm, isCreating]);

  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/signage/${serviceKey}/media?source=hq`);
      setMedia(data.data || data.media || []);
    } catch (err: any) {
      setError(err?.message || 'HQ 미디어를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, serviceKey]);

  useEffect(() => { void fetchMedia(); }, [fetchMedia]);

  const addTag = (value: string) => {
    const tag = value.trim().replace(/^#/, '');
    if (!tag || formTags.includes(tag)) return;
    setFormTags((prev) => [...prev, tag]);
  };
  const removeTag = (tag: string) => setFormTags((prev) => prev.filter((t) => t !== tag));

  const handleCreate = async () => {
    if (!formName.trim() || !formSourceUrl.trim()) return;
    if (formTags.length === 0) {
      setFormError('태그를 최소 1개 이상 입력해주세요');
      return;
    }
    const durationSec = parseDuration(formDuration);
    if (!formDuration.trim() || durationSec <= 0) {
      setFormError('재생시간을 입력하세요 (예: 10:30)');
      return;
    }
    setIsCreating(true);
    setFormError(null);
    try {
      await apiFetch(`/api/signage/${serviceKey}/hq/media`, {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          mediaType: 'video',
          description: formDescription.trim() || undefined,
          sourceType: formSourceType,
          sourceUrl: formSourceUrl.trim(),
          tags: formTags,
          duration: durationSec,
        }),
      });
      setShowForm(false);
      resetForm();
      void fetchMedia();
    } catch (err: any) {
      setFormError(err?.message || '미디어 등록에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteOne = useCallback(async (id: string) => {
    await apiFetch(`/api/signage/${serviceKey}/hq/media/${id}`, { method: 'DELETE' });
  }, [apiFetch, serviceKey]);

  const handleBulkDelete = async () => {
    const targetIds = [...selectedIds];
    await batch.executeBatch(
      async (ids) => {
        const results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> = [];
        for (const id of ids) {
          try {
            await deleteOne(id);
            results.push({ id, status: 'success' });
          } catch (err: any) {
            results.push({ id, status: 'failed', error: err?.message || '삭제 실패' });
          }
        }
        return { data: { results } };
      },
      targetIds,
    );
    setSelectedIds(new Set());
    void fetchMedia();
  };

  const stats = {
    total: media.length,
    active: media.filter((m) => m.status === 'active').length,
    pending: media.filter((m) => m.status === 'pending').length,
    archived: media.filter((m) => m.status === 'archived').length,
  };

  const filteredMedia = useMemo(() => {
    if (!searchKeyword.trim()) return media;
    const kw = searchKeyword.toLowerCase();
    return media.filter((m) =>
      m.name.toLowerCase().includes(kw) ||
      (SIGNAGE_MEDIA_TYPE_LABEL[m.mediaType] || m.mediaType).toLowerCase().includes(kw),
    );
  }, [media, searchKeyword]);

  const columns: ListColumnDef<SignageMediaItem>[] = [
    {
      key: 'name',
      header: '이름',
      render: (value) => <span className="font-medium text-slate-800 text-sm">{value}</span>,
    },
    {
      key: 'mediaType',
      header: '타입',
      render: (value) => <span className="text-sm text-slate-600">{SIGNAGE_MEDIA_TYPE_LABEL[value] || value}</span>,
    },
    {
      key: 'sourceType',
      header: '소스',
      render: (value) => <span className="text-sm text-slate-600">{SIGNAGE_SOURCE_TYPE_LABEL[value] || value}</span>,
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      render: (value) => {
        const sc = SIGNAGE_STATUS_CONFIG[value] || { text: value, cls: 'bg-slate-100 text-slate-600' };
        const isHubExposed = value === 'active';
        return (
          <div className="flex flex-col items-center gap-0.5">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>
            <span
              className={isHubExposed ? 'text-green-600' : 'text-slate-400'}
              style={{ fontSize: '10px' }}
            >
              {isHubExposed ? 'HUB 노출 중' : 'HUB 미노출'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      header: '생성일',
      render: (value) => <span className="text-sm text-slate-500">{formatDate(value)}</span>,
    },
    {
      key: '_actions',
      header: '액션',
      align: 'center',
      width: '60px',
      system: true,
      onCellClick: () => {},
      render: (_v, row) => (
        <RowActionMenu
          actions={buildRowActions(mediaActionPolicy, row, {
            view: () => navigate(`${routeBase}/hq-media/${row.id}`),
            delete: () => setDeleteTarget(row),
          }, { icons: MEDIA_ACTION_ICONS })}
        />
      ),
    },
  ];

  const bulkActions = [
    {
      key: 'delete',
      label: `삭제 (${selectedIds.size})`,
      onClick: handleBulkDelete,
      variant: 'danger' as const,
      icon: <Trash2 size={14} />,
      loading: batch.loading,
      group: 'danger',
      tooltip: '선택된 미디어를 일괄 삭제합니다',
      visible: selectedIds.size > 0,
      confirm: {
        title: '일괄 삭제 확인',
        message: `${selectedIds.size}개의 미디어를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`,
        variant: 'danger' as const,
        confirmText: '삭제',
      },
    },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Film className={`w-6 h-6 ${accent.icon}`} /> HQ 미디어 관리
            </h1>
            <p className="text-slate-500 text-sm mt-1">운영자 제공 사이니지 미디어 콘텐츠</p>
            <p className="text-xs text-slate-400 mt-0.5">활성 상태의 미디어만 매장 HUB에 노출됩니다</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className={`flex items-center gap-2 px-4 py-2 ${accent.primaryButton} text-white rounded-lg transition-colors text-sm font-medium`}
            >
              <Plus className="w-4 h-4" /> 새 미디어
            </button>
            <button
              onClick={() => void fetchMedia()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> 새로고침
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '전체', value: stats.total, color: 'text-slate-800' },
            { label: '활성', value: stats.active, color: 'text-green-600' },
            { label: '대기', value: stats.pending, color: 'text-amber-600' },
            { label: '아카이브', value: stats.archived, color: 'text-slate-500' },
          ].map((s) => (
            <div key={s.label} className={`bg-white rounded-xl p-4 border ${accent.cardBorder}`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="미디어 이름 또는 타입으로 검색..."
            className={`w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${accent.focusRing}`}
          />
        </div>

        {/* Bulk Action Bar */}
        <ActionBar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          actions={bulkActions}
        />

        <BulkResultModal
          open={batch.showResult}
          onClose={() => { batch.clearResult(); void fetchMedia(); }}
          result={batch.result}
          onRetry={() => { batch.retryFailed(); }}
        />

        {/* Table */}
        <DataTable<SignageMediaItem>
          columns={columns}
          data={filteredMedia}
          rowKey="id"
          loading={isLoading}
          onRowClick={(record) => navigate(`${routeBase}/hq-media/${record.id}`)}
          emptyMessage="HQ 미디어가 없습니다"
          tableId={`${config.tableIdPrefix}-hq-media`}
          selectable
          selectedKeys={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>

      {/* ── 동영상 등록 모달 ── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !isCreating) { setShowForm(false); resetForm(); } }}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-y-auto"
            style={{ maxHeight: '90vh' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">동영상 등록</h2>
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                disabled={isCreating}
                className="text-slate-400 hover:text-slate-600 p-1 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">제목 *</label>
                <input
                  type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  placeholder="동영상 제목을 입력하세요"
                  className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${accent.focusRing}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">동영상 URL *</label>
                <input
                  type="text" value={formSourceUrl} onChange={(e) => setFormSourceUrl(e.target.value)}
                  placeholder="YouTube 또는 Vimeo URL"
                  className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${accent.focusRing}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">설명 / 용도 메모</label>
                <textarea
                  value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="이 동영상의 활용 위치나 용도를 간략히 기록하세요" rows={2}
                  className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${accent.focusRing} resize-none`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">소스 타입</label>
                  <select
                    value={formSourceType} onChange={(e) => setFormSourceType(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${accent.focusRing}`}
                  >
                    <option value="url">URL</option>
                    <option value="youtube">YouTube</option>
                    <option value="vimeo">Vimeo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">재생시간 * (mm:ss)</label>
                  <input
                    type="text" value={formDuration} onChange={(e) => setFormDuration(e.target.value)}
                    placeholder="예: 10:30"
                    className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${accent.focusRing}`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">태그 * (최소 1개)</label>
                <div className="flex flex-wrap gap-1 mb-2" style={{ minHeight: 28 }}>
                  {formTags.map((tag) => (
                    <span key={tag} className={`inline-flex items-center gap-1 px-2 py-0.5 ${accent.tagPill} text-xs rounded-full`}>
                      #{tag}
                      <button type="button" onClick={() => removeTag(tag)} className="ml-0.5">×</button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={formTagInput}
                  onChange={(e) => setFormTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addTag(formTagInput);
                      setFormTagInput('');
                    }
                  }}
                  placeholder="태그 입력 후 Enter 또는 쉼표"
                  className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${accent.focusRing}`}
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {tagSuggestions.filter((t) => !formTags.includes(t)).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => addTag(t)}
                      className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>

            <div className="flex justify-end gap-2 px-6 pb-5">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                disabled={isCreating}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating || !formName.trim() || !formSourceUrl.trim() || formTags.length === 0}
                className={`px-4 py-2 ${accent.primaryButton} text-white rounded-lg text-sm font-medium disabled:opacity-50`}
              >
                {isCreating ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 삭제 안전 다이얼로그 (사용처 선조회) ── */}
      {deleteTarget && (
        <MediaDeleteDialog
          media={{ id: deleteTarget.id, name: deleteTarget.name }}
          apiFetch={apiFetch}
          serviceKey={serviceKey}
          routeBase={routeBase}
          linkTextClass={accent.linkText}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setDeleteTarget(null); void fetchMedia(); }}
        />
      )}
    </>
  );
}
