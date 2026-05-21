/**
 * OperatorResourcesPage — GlycoPharm 자료실 관리 (운영자 전용)
 *
 * WO-O4O-GLYCOPHARM-AI-CONTENT-ACTIVATION-V1
 *
 * Operator가 glycopharm_contents(sub_type=resource)를 관리하고
 * AI를 활용해 자료를 생성/저장할 수 있는 페이지.
 *
 * - 목록/검색/필터 (source_type, status, usage_type)
 * - 상태 변경 (published / private) + 삭제 (soft delete)
 * - Bulk ActionBar
 * - "AI 콘텐츠 생성" → AiContentModal → POST /glycopharm/operator/resources
 *
 * 저장 채널: POST /api/v1/glycopharm/operator/resources (glycopharm:operator 권한 필요)
 * 일반 회원용 POST 엔드포인트는 이번 WO에서 구현하지 않음.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  RefreshCw,
  AlertCircle,
  Search,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { RowActionMenu, ActionBar, BulkResultModal, BaseDetailDrawer } from '@o4o/ui';
import {
  DataTable,
  Pagination,
  defineActionPolicy,
  buildRowActions,
  useBatchAction,
} from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { AiContentModal } from '@o4o/content-editor';
import { getAccessToken } from '@o4o/auth-client';
import { glycoResourcesApi } from '@/api/resources';
import type { GlycoResourceItem } from '@/api/resources';
import { toast } from '@o4o/error-handling';

// ─── Status / Source / Usage labels ───────────────────────────────────────────

const STATUS_CONFIG: Record<string, { text: string; cls: string }> = {
  published: { text: '공개', cls: 'bg-green-50 text-green-700' },
  draft: { text: '초안', cls: 'bg-amber-50 text-amber-600' },
  private: { text: '숨김', cls: 'bg-slate-200 text-slate-600' },
};

const SOURCE_CONFIG: Record<string, { text: string; cls: string }> = {
  manual: { text: '직접 입력', cls: 'bg-slate-100 text-slate-600' },
  upload: { text: '파일', cls: 'bg-blue-50 text-blue-600' },
  external: { text: '외부 링크', cls: 'bg-purple-50 text-purple-600' },
};

const USAGE_CONFIG: Record<string, { text: string; cls: string }> = {
  READ:     { text: '📄 읽기',     cls: 'bg-slate-100 text-slate-600' },
  LINK:     { text: '🔗 링크',     cls: 'bg-blue-50 text-blue-600' },
  DOWNLOAD: { text: '⬇ 다운로드', cls: 'bg-green-50 text-green-600' },
  COPY:     { text: '📋 복사',     cls: 'bg-amber-50 text-amber-600' },
};

// ─── Action Policy ────────────────────────────────────────────────────────────

const resourceActionPolicy = defineActionPolicy<GlycoResourceItem>('glycopharm:resources', {
  rules: [
    { key: 'view', label: '상세 보기' },
    {
      key: 'publish',
      label: '노출',
      visible: (row) => row.status !== 'published',
    },
    {
      key: 'hide',
      label: '숨김',
      variant: 'default',
      visible: (row) => row.status === 'published',
      confirm: (row) => ({
        title: '자료 숨김',
        message: `"${row.title}" 자료를 숨김 처리합니다.`,
        variant: 'default' as const,
        confirmText: '숨김',
      }),
    },
    {
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      divider: true,
      confirm: (row) => ({
        title: '자료 삭제',
        message: `"${row.title}" 자료를 삭제합니다. 자료실에서 즉시 사라집니다.`,
        variant: 'danger' as const,
        confirmText: '삭제',
      }),
    },
  ],
});

const RESOURCE_ACTION_ICONS: Record<string, React.ReactNode> = {
  view:    <Eye className="w-4 h-4" />,
  publish: <Eye className="w-4 h-4" />,
  hide:    <EyeOff className="w-4 h-4" />,
  delete:  <Trash2 className="w-4 h-4" />,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ko-KR');
}

const PAGE_SIZE = 20;

// ─── Component ───────────────────────────────────────────────────────────────

export default function OperatorResourcesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<GlycoResourceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'' | 'manual' | 'upload' | 'external'>('');
  const [statusFilter, setStatusFilter] = useState<'' | 'draft' | 'published' | 'private'>('');
  const [usageTypeFilter, setUsageTypeFilter] = useState<'' | 'READ' | 'LINK' | 'DOWNLOAD' | 'COPY'>('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batch = useBatchAction();
  const [selectedItem, setSelectedItem] = useState<GlycoResourceItem | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await glycoResourcesApi.operatorList({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        source_type: sourceTypeFilter || undefined,
        status: statusFilter || undefined,
        usage_type: usageTypeFilter || undefined,
      });
      const d = (res as any).data?.data ?? (res as any).data;
      setItems(d?.items || []);
      setTotal(d?.total || 0);
    } catch (e: any) {
      setError(e?.message || '자료 목록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [page, search, sourceTypeFilter, statusFilter, usageTypeFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  // ─── Single-item actions ──────────────────────────────────────────────────

  const handlePublish = async (item: GlycoResourceItem) => {
    try {
      await glycoResourcesApi.operatorUpdateStatus(item.id, 'published');
      toast.success(`"${item.title}" 노출 처리되었습니다`);
      fetchItems();
    } catch (err: any) {
      toast.error(err?.message || '노출 처리에 실패했습니다');
    }
  };

  const handleHide = async (item: GlycoResourceItem) => {
    try {
      await glycoResourcesApi.operatorUpdateStatus(item.id, 'private');
      toast.success(`"${item.title}" 숨김 처리되었습니다`);
      fetchItems();
    } catch (err: any) {
      toast.error(err?.message || '숨김 처리에 실패했습니다');
    }
  };

  const handleDelete = async (item: GlycoResourceItem) => {
    try {
      await glycoResourcesApi.operatorDelete(item.id);
      toast.success(`"${item.title}" 삭제되었습니다`);
      fetchItems();
    } catch (err: any) {
      toast.error(err?.message || '삭제에 실패했습니다');
    }
  };

  // ─── Bulk actions ─────────────────────────────────────────────────────────

  const wrapBulk = async (op: (id: string) => Promise<unknown>, ids: string[]) => {
    const results = await Promise.allSettled(ids.map((id) => op(id)));
    return {
      data: {
        results: results.map((r, i) => ({
          id: ids[i],
          status: r.status === 'fulfilled' ? ('success' as const) : ('failed' as const),
          error: r.status === 'rejected'
            ? String((r as PromiseRejectedResult).reason?.message ?? r.reason)
            : undefined,
        })),
      },
    };
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const result = await batch.executeBatch(
      (batchIds) => wrapBulk((id) => glycoResourcesApi.operatorDelete(id), batchIds),
      ids,
    );
    if (result.successCount > 0) setSelectedIds(new Set());
  };

  const handleBulkPublish = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const result = await batch.executeBatch(
      (batchIds) => wrapBulk((id) => glycoResourcesApi.operatorUpdateStatus(id, 'published'), batchIds),
      ids,
    );
    if (result.successCount > 0) setSelectedIds(new Set());
  };

  const handleBulkHide = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const result = await batch.executeBatch(
      (batchIds) => wrapBulk((id) => glycoResourcesApi.operatorUpdateStatus(id, 'private'), batchIds),
      ids,
    );
    if (result.successCount > 0) setSelectedIds(new Set());
  };

  // ─── AI Channel Save ──────────────────────────────────────────────────────

  const handleAiChannelSave = async (data: {
    outputType: string;
    html: string;
    title: string;
    summary: string;
  }): Promise<{ success: boolean; fieldLabel?: string; error?: string }> => {
    try {
      await glycoResourcesApi.operatorCreate({
        title: data.title || '(AI 생성 자료)',
        summary: data.summary ? data.summary.slice(0, 300) : undefined,
        blocks: [{ type: 'html', content: data.html }],
        source_type: 'manual',
        usage_type: 'READ',
        reusable_policy: 'platform',
        status: 'draft',
      });
      await fetchItems();
      return { success: true, fieldLabel: '자료실' };
    } catch (err: any) {
      return { success: false, error: err?.message || '저장 중 오류가 발생했습니다' };
    }
  };

  // ─── Columns ──────────────────────────────────────────────────────────────

  const columns: ListColumnDef<GlycoResourceItem>[] = [
    {
      key: 'title',
      header: '제목',
      render: (_v, row) => (
        <div>
          <p className="font-medium text-sm text-slate-800 truncate max-w-md">
            {row.title || '(제목 없음)'}
          </p>
          {row.summary && (
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">{row.summary}</p>
          )}
        </div>
      ),
    },
    {
      key: 'author_name',
      header: '작성자',
      width: '120px',
      render: (v) => <span className="text-sm text-slate-600">{(v as string) || '-'}</span>,
    },
    {
      key: 'source_type',
      header: '유형',
      width: '90px',
      align: 'center',
      render: (v) => {
        const cfg = SOURCE_CONFIG[v as string] || { text: v as string, cls: 'bg-slate-100 text-slate-500' };
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.cls}`}>{cfg.text}</span>;
      },
    },
    {
      key: 'usage_type',
      header: '활용방식',
      width: '110px',
      align: 'center',
      render: (v) => {
        const cfg = USAGE_CONFIG[v as string] || { text: (v as string) || '-', cls: 'bg-slate-100 text-slate-500' };
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.cls}`}>{cfg.text}</span>;
      },
    },
    {
      key: 'source_file_name',
      header: '파일/링크',
      width: '180px',
      render: (_v, row) => {
        if (row.source_type === 'upload' && row.source_file_name) {
          return (
            <span className="text-xs text-slate-500 truncate block max-w-[160px]" title={row.source_file_name}>
              {row.source_file_name}
            </span>
          );
        }
        if (row.source_type === 'external' && row.source_url) {
          return (
            <a
              href={row.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline truncate max-w-[160px]"
              title={row.source_url}
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{row.source_url}</span>
            </a>
          );
        }
        return <span className="text-xs text-slate-300">-</span>;
      },
    },
    {
      key: 'view_count',
      header: '조회수',
      width: '70px',
      align: 'center',
      render: (v) => <span className="text-sm text-slate-500">{(v as number) ?? 0}</span>,
    },
    {
      key: 'status',
      header: '상태',
      width: '80px',
      align: 'center',
      render: (v) => {
        const sc = STATUS_CONFIG[v as string] || { text: v as string, cls: 'bg-slate-100 text-slate-500' };
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>
        );
      },
    },
    {
      key: 'created_at',
      header: '등록일',
      width: '100px',
      render: (v) => <span className="text-sm text-slate-500">{formatDate(v as string)}</span>,
    },
    {
      key: '_actions',
      header: '',
      align: 'center',
      width: '60px',
      system: true,
      onCellClick: () => {},
      render: (_v, row) => (
        <RowActionMenu
          actions={buildRowActions(
            resourceActionPolicy,
            row,
            {
              view: () => navigate(`/resources/${row.id}`),
              publish: () => handlePublish(row),
              hide: () => handleHide(row),
              delete: () => handleDelete(row),
            },
            { icons: RESOURCE_ACTION_ICONS },
          )}
        />
      ),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>자료실 관리</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            자료실 자료 운영 관리 (glycopharm_contents) — 총 {total}개
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setAiModalOpen(true)}
            style={aiCreateBtnStyle}
          >
            <Sparkles size={14} />
            AI 콘텐츠 생성
          </button>
          <button onClick={fetchItems} style={refreshBtnStyle}>
            <RefreshCw size={14} />
            새로고침
          </button>
        </div>
      </div>

      {/* 정책 안내 */}
      <div style={policyBannerStyle}>
        <strong>숨김</strong> 처리한 자료는 자료실에서 보이지 않습니다.
        <strong> 삭제</strong>는 즉시 자료실에서 제거됩니다(soft delete).
        AI로 생성된 자료는 <strong>초안</strong> 상태로 저장됩니다.
      </div>

      {/* Search + Filters */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search
            size={15}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="제목·요약·태그 검색..."
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 14,
              boxSizing: 'border-box' as const,
              outline: 'none',
            }}
          />
        </div>
        <select
          value={sourceTypeFilter}
          onChange={(e) => { setSourceTypeFilter(e.target.value as typeof sourceTypeFilter); setPage(1); }}
          style={selectStyle}
        >
          <option value="">전체 유형</option>
          <option value="manual">직접 입력</option>
          <option value="upload">파일</option>
          <option value="external">외부 링크</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
          style={selectStyle}
        >
          <option value="">전체 상태</option>
          <option value="published">공개</option>
          <option value="draft">초안</option>
          <option value="private">숨김</option>
        </select>
        <select
          value={usageTypeFilter}
          onChange={(e) => { setUsageTypeFilter(e.target.value as typeof usageTypeFilter); setPage(1); }}
          style={selectStyle}
        >
          <option value="">전체 활용방식</option>
          <option value="READ">📄 읽기</option>
          <option value="LINK">🔗 링크</option>
          <option value="DOWNLOAD">⬇ 다운로드</option>
          <option value="COPY">📋 복사</option>
        </select>
        <button type="submit" style={searchBtnStyle}>검색</button>
        {(search || sourceTypeFilter || statusFilter || usageTypeFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearch(''); setSearchInput('');
              setSourceTypeFilter(''); setStatusFilter(''); setUsageTypeFilter('');
              setPage(1);
            }}
            style={clearBtnStyle}
          >
            초기화
          </button>
        )}
      </form>

      {/* Loading */}
      {loading && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14 }}>자료 목록을 불러오는 중...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <AlertCircle size={28} style={{ margin: '0 auto 12px', color: '#dc2626' }} />
          <p style={{ fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{error}</p>
          <button onClick={fetchItems} style={retryBtnStyle}>
            <RefreshCw size={14} /> 다시 시도
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          <FileText size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>
            {search || sourceTypeFilter || statusFilter
              ? '필터에 해당하는 자료가 없습니다'
              : '등록된 자료가 없습니다. AI 콘텐츠 생성으로 자료를 추가해보세요.'}
          </p>
        </div>
      )}

      {/* BulkResultModal */}
      <BulkResultModal
        open={batch.showResult}
        onClose={() => { batch.clearResult(); fetchItems(); }}
        result={batch.result}
        onRetry={() => batch.retryFailed()}
      />

      {/* ActionBar */}
      {!error && items.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <ActionBar
            selectedCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            actions={[
              {
                key: 'publish',
                label: '노출',
                onClick: handleBulkPublish,
                variant: 'primary',
                icon: <Eye size={14} />,
                loading: batch.loading,
                confirm: {
                  title: '선택 자료 노출',
                  message: `${selectedIds.size}건을 노출 처리합니다.`,
                  confirmText: '노출',
                },
              },
              {
                key: 'hide',
                label: '숨김',
                onClick: handleBulkHide,
                variant: 'default',
                icon: <EyeOff size={14} />,
                loading: batch.loading,
                confirm: {
                  title: '선택 자료 숨김',
                  message: `${selectedIds.size}건을 숨김 처리합니다.`,
                  confirmText: '숨김',
                },
              },
              {
                key: 'delete',
                label: '삭제',
                onClick: handleBulkDelete,
                variant: 'danger',
                icon: <Trash2 size={14} />,
                loading: batch.loading,
                confirm: {
                  title: '선택 자료 삭제',
                  message: `${selectedIds.size}건을 삭제합니다.`,
                  variant: 'danger',
                  confirmText: '삭제',
                },
              },
            ]}
          />
        </div>
      )}

      {/* Table */}
      {!error && items.length > 0 && (
        <>
          <DataTable<GlycoResourceItem>
            columns={columns}
            data={items}
            rowKey="id"
            emptyMessage="자료가 없습니다"
            selectable
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={(row) => setSelectedItem(row)}
          />
          {total > PAGE_SIZE && (
            <Pagination
              page={page}
              totalPages={Math.ceil(total / PAGE_SIZE)}
              onPageChange={setPage}
              total={total}
            />
          )}
        </>
      )}

      {/* 자료 상세 Drawer */}
      <BaseDetailDrawer
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title ?? ''}
        width={520}
      >
        {selectedItem && (
          <div style={{ fontSize: 14, color: '#374151' }}>
            {selectedItem.summary && (
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>{selectedItem.summary}</p>
            )}
            {[
              { label: '유형', value: SOURCE_CONFIG[selectedItem.source_type]?.text || selectedItem.source_type },
              { label: '활용방식', value: USAGE_CONFIG[selectedItem.usage_type as string]?.text || (selectedItem.usage_type as string) || '-' },
              { label: '상태', value: STATUS_CONFIG[selectedItem.status]?.text || selectedItem.status },
              { label: '작성자', value: selectedItem.author_name || '-' },
              { label: '조회수', value: String(selectedItem.view_count ?? 0) },
              { label: '등록일', value: formatDate(selectedItem.created_at) },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: '#64748b', minWidth: 70, flexShrink: 0 }}>{item.label}</span>
                <span style={{ color: '#1e293b' }}>{item.value}</span>
              </div>
            ))}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
              <a href={`/resources/${selectedItem.id}`} style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>
                상세 페이지 이동 →
              </a>
            </div>
          </div>
        )}
      </BaseDetailDrawer>

      {/* AI Content Modal */}
      <AiContentModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        editor={null}
        onChannelSave={handleAiChannelSave}
        aiRequestHeaders={(() => {
          const token = getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : undefined;
        })()}
        headerLabel="AI 자료 생성"
      />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  backgroundColor: '#fff',
  cursor: 'pointer',
};

const searchBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#475569',
  color: '#fff',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  border: 'none',
  cursor: 'pointer',
};

const clearBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  color: '#64748b',
  backgroundColor: '#fff',
  cursor: 'pointer',
};

const refreshBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
  color: '#475569',
  backgroundColor: '#fff',
  cursor: 'pointer',
};

const retryBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 13,
  color: '#475569',
  backgroundColor: '#fff',
  cursor: 'pointer',
};

const aiCreateBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  backgroundColor: '#7c3aed',
  color: '#fff',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
};

const policyBannerStyle: React.CSSProperties = {
  padding: '10px 14px',
  backgroundColor: '#f0f9ff',
  border: '1px solid #bae6fd',
  borderRadius: 8,
  marginBottom: 16,
  fontSize: 13,
  color: '#0c4a6e',
};
