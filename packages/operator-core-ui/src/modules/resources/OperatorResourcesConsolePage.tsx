/**
 * OperatorResourcesConsolePage — 운영자 자료실 관리 wrapper.
 *
 * WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1
 *   KPA / K-Cosmetics 2 service 의 OperatorResourcesPage 통합.
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §3
 *   원장별 lifecycle 차이(상태 집합 · 허용 전이 · 삭제 지원 · 등록/편집 지원)를
 *   `lifecycle` config 로 표현한다. 공통 콘솔에 **서비스 분기(serviceKey 비교)는 없다**.
 *   config 를 주지 않으면 `DEFAULT_RESOURCES_LIFECYCLE` — 기존 3 service 의 현행 behavior 그대로다.
 *   허용되지 않은 전이 · 지원하지 않는 삭제는 **CTA 자체를 그리지 않는다**.
 */

import { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import type React from 'react';
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
  Plus,
  Pencil,
  Send,
  Undo2,
  Archive,
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
import type {
  OperatorResourcesConsolePageProps,
  ResourcesConsoleItem,
  ResourcesConsoleListParams,
  ResourcesFormValue,
  ResourcesTransitionActionDef,
  ResourcesTransitionIcon,
} from './types';
import { DEFAULT_RESOURCES_NOUNS } from './types';
import { DEFAULT_RESOURCES_LIFECYCLE } from './lifecycle';
import { ResourcesFormModal } from './ResourcesFormModal';

// ─── Config ─────────────────────────────────────────────────────────────────

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

const TRANSITION_ICONS: Record<ResourcesTransitionIcon, React.ReactNode> = {
  eye: <Eye className="w-4 h-4" />,
  'eye-off': <EyeOff className="w-4 h-4" />,
  send: <Send className="w-4 h-4" />,
  undo: <Undo2 className="w-4 h-4" />,
  archive: <Archive className="w-4 h-4" />,
};

const BULK_ICONS: Record<ResourcesTransitionIcon, React.ReactNode> = {
  eye: <Eye size={14} />,
  'eye-off': <EyeOff size={14} />,
  send: <Send size={14} />,
  undo: <Undo2 size={14} />,
  archive: <Archive size={14} />,
};

const PAGE_SIZE = 20;

/** 미지정 시 명사 config 로 조립한다 — 기존 소비처(명사 미지정)에서는 종전 문구와 동일하다. */
const defaultPolicyBanner = (n: { entity: string; collection: string }) =>
  `숨김 처리한 ${n.entity}는 ${n.collection}에서 보이지 않습니다. 삭제는 즉시 ${n.collection}에서 제거됩니다(soft delete).`;

/** 전이 action 의 row/menu 키. lifecycle 이 정한 목표 상태로 유일하다. */
const transitionKey = (to: string) => `to:${to}`;

function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ko-KR');
}

function unwrapList(res: any): { items: ResourcesConsoleItem[]; total: number } {
  // 서비스별 axios wrapper 와 KPA 의 apiClient wrapper 의 응답 shape 변형 모두 흡수.
  const d = res?.data?.data ?? res?.data ?? res;
  ensureSuccess(res);
  if (!Array.isArray(d?.items) || typeof d.total !== 'number') throw new Error('자료 목록 응답을 확인하지 못했습니다.');
  return { items: d.items, total: d.total };
}

function ensureSuccess(res: any) {
  for (const envelope of [res, res?.data, res?.data?.data]) {
    if (envelope?.success === false) throw new Error(envelope.error || envelope.message || '처리에 실패했습니다.');
  }
}
function errorMessage(e: unknown, fallback: string) {
  const error = e as { response?: { data?: { error?: string } }; message?: string };
  return error?.response?.data?.error || error?.message || fallback;
}
function unwrapItem(res: any): any {
  ensureSuccess(res);
  return res?.data?.data ?? res?.data ?? res;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function OperatorResourcesConsolePage({
  serviceKey,
  client,
  aiSlot,
  policyBanner,
  detailLinkPath = (id) => `/resources/${id}`,
  lifecycle = DEFAULT_RESOURCES_LIFECYCLE,
}: OperatorResourcesConsolePageProps) {
  // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §3:
  //   도메인 명사는 config 다 — 축마다 콘솔을 복제하지 않는다. 미지정이면 기존 문구 그대로.
  const nouns = lifecycle.nouns ?? DEFAULT_RESOURCES_NOUNS;
  const caps = lifecycle.fieldCapabilities;
  const canCreate = lifecycle.visibleActions.includes('create') && !!client.operatorCreate;
  const canEdit = lifecycle.visibleActions.includes('edit') && !!client.operatorUpdate;
  const canDelete = lifecycle.supportsDelete && !!client.operatorDelete;

  const statusLabel = (v: string) => lifecycle.statuses.find((s) => s.value === v)?.label ?? v;
  const statusClass = (v: string) =>
    lifecycle.statuses.find((s) => s.value === v)?.className ?? 'bg-slate-100 text-slate-500';
  /** row 상태에서 실제로 가능한 전이만 남긴다 — 불가능한 전이는 그리지 않는다. */
  const transitionsFor = (status: string): ResourcesTransitionActionDef[] => {
    const allowed = lifecycle.allowedTransitions[status] ?? [];
    return lifecycle.transitionActions.filter((t) => allowed.includes(t.to));
  };

  const [items, setItems] = useState<ResourcesConsoleItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'' | 'manual' | 'upload' | 'external'>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [usageTypeFilter, setUsageTypeFilter] = useState<'' | 'READ' | 'LINK' | 'DOWNLOAD' | 'COPY'>('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batch = useBatchAction();
  const [selectedItem, setSelectedItem] = useState<ResourcesConsoleItem | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<ResourcesFormValue | null>(null);

  const [writing, setWriting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const scopeRef = useRef({ mounted: false, list: 0, form: 0, writing: false });
  useLayoutEffect(() => {
    const scope = { mounted: true, list: 0, form: 0, writing: false };
    scopeRef.current = scope;
    setItems([]); setTotal(0); setSelectedIds(new Set()); setSelectedItem(null);
    setFormOpen(false); setFormLoading(false); setAiOpen(false); setWriting(false);
    setNotice(null); setActionError(null); setRefreshFailed(false); setFormError(null);
    return () => { scope.mounted = false; scope.list++; scope.form++; };
  }, [client, serviceKey, lifecycle]);
  useLayoutEffect(() => {
    scopeRef.current.list++;
    setSelectedIds(new Set()); setSelectedItem(null);
  }, [page, search, sourceTypeFilter, statusFilter, usageTypeFilter]);

  const fetchItems = useCallback(async () => {
    const scope = scopeRef.current;
    if (!scope.mounted) return false;
    const sequence = ++scope.list;
    const current = () => scope.mounted && sequence === scope.list;
    setLoading(true);
    setError(null);
    try {
      const res = await client.operatorList({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        source_type: sourceTypeFilter || undefined,
        // 상태 값 목록은 lifecycle config(원장별)가 정하고 서버가 검증한다.
        // 파라미터 타입은 기존 3 service client 선언을 깨지 않기 위해 좁게 유지한다.
        status: (statusFilter || undefined) as ResourcesConsoleListParams['status'],
        usage_type: usageTypeFilter || undefined,
      });
      const { items: rows, total: t } = unwrapList(res);
      if (!current()) return false;
      const lastPage = Math.max(1, Math.ceil(t / PAGE_SIZE));
      if (page > lastPage) { setPage(lastPage); return true; }
      setItems(rows); setTotal(t); setSelectedIds(new Set());
      setRefreshFailed(false);
      return true;
    } catch (e: any) {
      if (current()) setError(errorMessage(e, `${nouns.entity} 목록을 불러오지 못했습니다`));
      return false;
    } finally {
      if (current()) setLoading(false);
    }
  }, [client, page, search, sourceTypeFilter, statusFilter, usageTypeFilter, nouns.entity]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const renderedScope = scopeRef.current;
  const renderedList = renderedScope.list;
  const refreshAfterWrite = async () => {
    const scope = scopeRef.current;
    if (!scope.mounted) return;
    const ok = await fetchItems();
    if (scope.mounted) setRefreshFailed(!ok);
  };
  const runWrite = async (operation: () => Promise<void>) => {
    const scope = scopeRef.current;
    if (!scope.mounted || scope.writing || scope !== renderedScope) return;
    if (loading || error || renderedList !== scope.list) {
      setActionError('목록을 다시 확인한 뒤 처리해 주세요.'); return;
    }
    scope.writing = true; setWriting(true); setActionError(null); setNotice(null);
    try { await operation(); }
    finally { scope.writing = false; if (scope.mounted) setWriting(false); }
  };
  const closeForm = () => {
    if (scopeRef.current.writing) return;
    scopeRef.current.form++;
    setFormOpen(false); setEditingId(null); setFormError(null); setFormLoading(false);
  };
  const controlsLocked = writing || formOpen || aiOpen;

  const changeView = (change: () => void) => {
    if (scopeRef.current.writing || formOpen || aiOpen) return;
    setNotice(null); setActionError(null); setRefreshFailed(false); change();
  };
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (scopeRef.current.writing) return;
    changeView(() => { setSearch(searchInput.trim()); setPage(1); });
  };

  // ─── Action Policy (lifecycle 기반 조립) ──────────────────────────────────

  const resourceActionPolicy = defineActionPolicy<ResourcesConsoleItem>(`${serviceKey}:resources`, {
    rules: [
      ...(lifecycle.visibleActions.includes('view') ? [{ key: 'view', label: '상세 보기' }] : []),
      ...(canEdit ? [{ key: 'edit', label: '편집' }] : []),
      ...lifecycle.transitionActions.map((t) => ({
        key: transitionKey(t.to),
        label: t.label,
        variant: t.variant === 'primary' ? undefined : t.variant,
        visible: (row: ResourcesConsoleItem) =>
          (lifecycle.allowedTransitions[row.status] ?? []).includes(t.to),
        ...(t.rowConfirm
          ? {
              confirm: (row: ResourcesConsoleItem) => ({
                title: t.rowConfirm!.title,
                message: `"${row.title}" ${nouns.entity}를 ${t.label} 처리합니다.`,
                variant: (t.rowConfirm!.variant ?? 'default') as 'default' | 'danger',
                confirmText: t.rowConfirm!.confirmText,
              }),
            }
          : {}),
      })),
      ...(canDelete
        ? [
            {
              key: 'delete',
              label: '삭제',
              variant: 'danger' as const,
              divider: true,
              confirm: (row: ResourcesConsoleItem) => ({
                title: `${nouns.entity} 삭제`,
                message: `"${row.title}" ${nouns.entity}를 삭제합니다. ${nouns.collection}에서 즉시 사라집니다.`,
                variant: 'danger' as const,
                confirmText: '삭제',
              }),
            },
          ]
        : []),
    ],
  });

  const rowActionIcons: Record<string, React.ReactNode> = {
    view: <Eye className="w-4 h-4" />,
    edit: <Pencil className="w-4 h-4" />,
    delete: <Trash2 className="w-4 h-4" />,
    ...Object.fromEntries(
      lifecycle.transitionActions
        .filter((t) => t.icon)
        .map((t) => [transitionKey(t.to), TRANSITION_ICONS[t.icon!]]),
    ),
  };

  // ─── Single-item actions ──────────────────────────────────────────────────

  const handleTransition = (item: ResourcesConsoleItem, t: ResourcesTransitionActionDef) => runWrite(async () => {
    const scope = scopeRef.current;
    try {
      ensureSuccess(await client.operatorUpdateStatus(item.id, t.to));
      if (!scope.mounted) return;
      setNotice(t.successMessage ? t.successMessage(item.title) : `"${item.title}" ${t.label} 처리되었습니다`);
      setSelectedItem(null);
      await refreshAfterWrite();
    } catch (e) { if (scope.mounted) setActionError(errorMessage(e, `${t.label} 처리에 실패했습니다`)); }
  });

  const handleDelete = (item: ResourcesConsoleItem) => runWrite(async () => {
    if (!client.operatorDelete) return;
    const scope = scopeRef.current;
    try {
      ensureSuccess(await client.operatorDelete(item.id));
      if (!scope.mounted) return;
      setNotice(`"${item.title}" 삭제되었습니다`); setSelectedItem(null);
      await refreshAfterWrite();
    } catch (e) { if (scope.mounted) setActionError(errorMessage(e, '삭제에 실패했습니다')); }
  });

  // ─── Create / Edit ────────────────────────────────────────────────────────

  const openCreate = () => {
    if (scopeRef.current.writing) return;
    scopeRef.current.form++;
    setFormLoading(false); setFormError(null); setEditingId(null);
    setFormInitial(null); setFormOpen(true);
  };

  const openEdit = async (item: ResourcesConsoleItem) => {
    const scope = scopeRef.current;
    if (scope.writing || loading || error) return;
    const sequence = ++scope.form;
    const current = () => scope.mounted && sequence === scope.form;
    setEditingId(item.id); setFormError(null);
    setFormInitial({ title: item.title, summary: item.summary ?? '' });
    setFormOpen(true);
    if (!client.operatorGet) return;
    setFormLoading(true);
    try {
      const detail = unwrapItem(await client.operatorGet(item.id));
      if (!current()) return;
      setFormInitial({ title: detail?.title ?? item.title, summary: detail?.summary ?? '', body: detail?.body ?? '', linkUrl: detail?.linkUrl ?? '', linkText: detail?.linkText ?? '' });
    } catch (e) {
      if (current()) { setActionError(errorMessage(e, `${nouns.entity}를 불러오지 못했습니다`)); setFormOpen(false); }
    } finally { if (current()) setFormLoading(false); }
  };

  const handleFormSubmit = (value: ResourcesFormValue) => runWrite(async () => {
    const scope = scopeRef.current;
    setFormError(null);
    try {
      ensureSuccess(editingId ? await client.operatorUpdate!(editingId, value) : await client.operatorCreate!(value));
      if (!scope.mounted) return;
      setNotice(`${nouns.entity}를 ${editingId ? '수정' : '등록'}했습니다`);
      setFormOpen(false); setEditingId(null); scope.form++;
      await refreshAfterWrite();
    } catch (e) { if (scope.mounted) setFormError(errorMessage(e, '저장에 실패했습니다')); }
  });

  // ─── Bulk Actions (Promise.allSettled wrap — canonical) ───────────────────

  const wrapBulk = async (
    op: (id: string) => Promise<unknown>,
    ids: string[],
  ): Promise<{ data: { results: { id: string; status: 'success' | 'failed'; error?: string }[] } }> => {
    const results = await Promise.allSettled(ids.map(async (id) => ensureSuccess(await op(id))));
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

  const runBulk = (op: (id: string) => Promise<unknown>) => runWrite(async () => {
    const scope = scopeRef.current;
    const ids = [...selectedIds].filter(id => items.some(item => item.id === id));
    if (ids.length === 0) return;
    const result = await batch.executeBatch((batchIds: string[]) => wrapBulk(op, batchIds), ids);
    if (!scope.mounted) return;
    if (result.successCount > 0) {
      setNotice(`${result.successCount}건 처리 완료${result.failedCount ? ` · ${result.failedCount}건 실패` : ''}`);
      setSelectedIds(new Set()); await refreshAfterWrite();
    }
  });

  const bulkActions = [
    ...lifecycle.transitionActions
      .filter((t) => !!t.bulkConfirm)
      .map((t) => ({
        key: transitionKey(t.to),
        label: t.label,
        onClick: () => runBulk((id) => client.operatorUpdateStatus(id, t.to)),
        variant: (t.variant ?? 'default') as 'primary' | 'default' | 'danger',
        icon: t.icon ? BULK_ICONS[t.icon] : undefined,
        loading: writing,
        disabled: writing || loading || !!error || formOpen || aiOpen,
        confirm: {
          title: t.bulkConfirm!.title,
          message: `${selectedIds.size}건을 ${t.label} 처리합니다.`,
          confirmText: t.bulkConfirm!.confirmText,
          ...(t.bulkConfirm!.variant ? { variant: t.bulkConfirm!.variant } : {}),
        },
      })),
    ...(canDelete
      ? [
          {
            key: 'delete',
            label: '삭제',
            onClick: () => runBulk((id) => client.operatorDelete!(id)),
            variant: 'danger' as const,
            icon: <Trash2 size={14} />,
            loading: writing,
            disabled: writing || loading || !!error || formOpen || aiOpen,
            confirm: {
              title: `선택 ${nouns.entity} 삭제`,
              message: `${selectedIds.size}건을 삭제합니다.`,
              variant: 'danger' as const,
              confirmText: '삭제',
            },
          },
        ]
      : []),
  ];

  // ─── Columns ──────────────────────────────────────────────────────────────

  const columns: ListColumnDef<ResourcesConsoleItem>[] = [
    {
      key: 'title',
      header: '제목',
      render: (_v: any, row: ResourcesConsoleItem) => (
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
    ...(caps.author
      ? ([{
          key: 'author_name',
          header: '작성자',
          width: '120px',
          render: (v: any) => <span className="text-sm text-slate-600">{(v as string) || '-'}</span>,
        }] as ListColumnDef<ResourcesConsoleItem>[])
      : []),
    ...(caps.sourceType
      ? ([{
          key: 'source_type',
          header: '유형',
          width: '90px',
          align: 'center',
          render: (v: any) => {
            const cfg = SOURCE_CONFIG[v as string] || { text: v as string, cls: 'bg-slate-100 text-slate-500' };
            return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.cls}`}>{cfg.text}</span>;
          },
        }] as ListColumnDef<ResourcesConsoleItem>[])
      : []),
    ...(caps.usageType
      ? ([{
          key: 'usage_type',
          header: '활용방식',
          width: '110px',
          align: 'center',
          render: (v: any) => {
            const cfg = USAGE_CONFIG[v as string] || { text: (v as string) || '-', cls: 'bg-slate-100 text-slate-500' };
            return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.cls}`}>{cfg.text}</span>;
          },
        }] as ListColumnDef<ResourcesConsoleItem>[])
      : []),
    ...(caps.sourceFileOrLink
      ? ([{
          key: 'source_file_name',
          header: '파일/링크',
          width: '180px',
          render: (_v: any, row: ResourcesConsoleItem) => {
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
        }] as ListColumnDef<ResourcesConsoleItem>[])
      : []),
    ...(caps.viewCount
      ? ([{
          key: 'view_count',
          header: '조회수',
          width: '70px',
          align: 'center',
          render: (v: any) => <span className="text-sm text-slate-500">{(v as number) ?? 0}</span>,
        }] as ListColumnDef<ResourcesConsoleItem>[])
      : []),
    {
      key: 'status',
      header: '상태',
      width: '80px',
      align: 'center',
      render: (v: any) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(v as string)}`}>
          {statusLabel(v as string)}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: '등록일',
      width: '100px',
      render: (v: any) => <span className="text-sm text-slate-500">{formatDate(v as string)}</span>,
    },
    {
      key: '_actions',
      header: '',
      align: 'center',
      width: '60px',
      system: true,
      onCellClick: () => {},
      render: (_v: any, row: ResourcesConsoleItem) => (
        <RowActionMenu
          disabled={controlsLocked || loading || !!error}
          actions={buildRowActions(
            resourceActionPolicy,
            row,
            {
              view: () => { window.location.href = detailLinkPath(row.id); },
              edit: () => { void openEdit(row); },
              delete: () => handleDelete(row),
              ...Object.fromEntries(
                lifecycle.transitionActions.map((t) => [
                  transitionKey(t.to),
                  () => handleTransition(row, t),
                ]),
              ),
            },
            { icons: rowActionIcons },
          )}
        />
      ),
    },
  ];

  const aiScope = scopeRef.current;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>{nouns.consoleTitle}</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            {nouns.collection} {nouns.entity} 운영 관리{!loading && !error ? ` — 총 ${total}개` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canCreate && (
            <button disabled={controlsLocked || loading || !!error} onClick={openCreate} style={createBtnStyle}>
              <Plus size={14} />
              {lifecycle.form?.createLabel ?? `새 ${nouns.entity}`}
            </button>
          )}
          {aiSlot && (
            <button disabled={controlsLocked} onClick={() => setAiOpen(true)} style={aiCreateBtnStyle}>
              <Sparkles size={14} />
              {aiSlot.buttonLabel}
            </button>
          )}
          <button disabled={controlsLocked || loading} onClick={() => void fetchItems()} style={refreshBtnStyle}>
            <RefreshCw size={14} />
            새로고침
          </button>
        </div>
      </div>

      {notice && <p role="status" className="mb-3 text-emerald-700">{notice}</p>}
      {actionError && <p role="alert" className="mb-3 text-red-700">{actionError}</p>}
      {refreshFailed && <p role="alert" className="mb-3 text-amber-700">처리는 완료했지만 최신 목록을 확인하지 못했습니다. 목록만 다시 조회해 주세요.</p>}
      {/* 정책 안내 */}
      <div style={policyBannerStyle}>{policyBanner ?? defaultPolicyBanner(nouns)}</div>

      {/* Search + Filters */}
      <fieldset disabled={controlsLocked} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {caps.search && (
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
        )}
        {caps.sourceType && (
          <select
            aria-label="자료 유형"
            value={sourceTypeFilter}
            onChange={(e) => changeView(() => { setSourceTypeFilter(e.target.value as typeof sourceTypeFilter); setPage(1); })}
            style={selectStyle}
          >
            <option value="">전체 유형</option>
            <option value="manual">직접 입력</option>
            <option value="upload">파일</option>
            <option value="external">외부 링크</option>
          </select>
        )}
        <select
          aria-label="자료 상태"
          value={statusFilter}
          onChange={(e) => changeView(() => { setStatusFilter(e.target.value); setPage(1); })}
          style={selectStyle}
        >
          <option value="">전체 상태</option>
          {lifecycle.statuses
            .filter((s) => s.filterable !== false)
            .map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
        </select>
        {caps.usageType && (
          <select
            aria-label="자료 활용방식"
            value={usageTypeFilter}
            onChange={(e) => changeView(() => { setUsageTypeFilter(e.target.value as typeof usageTypeFilter); setPage(1); })}
            style={selectStyle}
          >
            <option value="">전체 활용방식</option>
            <option value="READ">📄 읽기</option>
            <option value="LINK">🔗 링크</option>
            <option value="DOWNLOAD">⬇ 다운로드</option>
            <option value="COPY">📋 복사</option>
          </select>
        )}
        <button type="submit" style={searchBtnStyle}>검색</button>
        {(search || sourceTypeFilter || statusFilter || usageTypeFilter) && (
          <button
            type="button"
            onClick={() => changeView(() => {
              setSearch(''); setSearchInput('');
              setSourceTypeFilter(''); setStatusFilter(''); setUsageTypeFilter('');
              setPage(1);
            })}
            style={clearBtnStyle}
          >
            초기화
          </button>
        )}
      </form>
      </fieldset>

      {/* Loading */}
      {loading && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14 }}>{nouns.entity} 목록을 불러오는 중...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div role="alert" style={{ textAlign: 'center', padding: 60 }}>
          <AlertCircle size={28} style={{ margin: '0 auto 12px', color: '#dc2626' }} />
          <p style={{ fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{error}</p>
          <button disabled={controlsLocked || loading} onClick={() => void fetchItems()} style={retryBtnStyle}>
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
              ? `필터에 해당하는 ${nouns.entity}가 없습니다`
              : `등록된 ${nouns.entity}가 없습니다`}
          </p>
        </div>
      )}

      {/* BulkResultModal */}
      <BulkResultModal
        open={batch.showResult}
        onClose={() => { if (!scopeRef.current.writing) batch.clearResult(); }}
        result={batch.result}
        onRetry={() => runWrite(async () => {
          const scope = scopeRef.current;
          const result = await batch.retryFailed();
          if (scope.mounted && result?.successCount) { setNotice(`${result.successCount}건 재시도 완료`); await refreshAfterWrite(); }
        })}
      />

      {/* ActionBar */}
      {!error && items.length > 0 && bulkActions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <ActionBar
            selectedCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            actions={bulkActions}
          />
        </div>
      )}

      {/* Table */}
      {!error && items.length > 0 && (
        <>
          <DataTable<ResourcesConsoleItem>
            columns={columns}
            data={items}
            rowKey="id"
            emptyMessage={`${nouns.entity}가 없습니다`}
            selectable={bulkActions.length > 0}
            selectedKeys={selectedIds}
            onSelectionChange={ids => { if (!controlsLocked && !loading) setSelectedIds(ids); }}
            onRowClick={(row) => { if (!controlsLocked && !loading) setSelectedItem(row); }}
          />
          {total > PAGE_SIZE && (
            <Pagination
              page={page}
              totalPages={Math.ceil(total / PAGE_SIZE)}
              onPageChange={next => changeView(() => setPage(next))}
              total={total}
            />
          )}
        </>
      )}

      {/* 상세 Drawer */}
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
              ...(caps.sourceType
                ? [{ label: '유형', value: SOURCE_CONFIG[selectedItem.source_type]?.text || selectedItem.source_type }]
                : []),
              ...(caps.usageType
                ? [{ label: '활용방식', value: USAGE_CONFIG[selectedItem.usage_type as string]?.text || (selectedItem.usage_type as string) || '-' }]
                : []),
              { label: '상태', value: statusLabel(selectedItem.status) },
              ...(caps.author ? [{ label: '작성자', value: selectedItem.author_name || '-' }] : []),
              ...(caps.viewCount ? [{ label: '조회수', value: String(selectedItem.view_count ?? 0) }] : []),
              { label: '등록일', value: formatDate(selectedItem.created_at) },
            ].map((item: { label: string; value: string }) => (
              <div key={item.label} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: '#64748b', minWidth: 70, flexShrink: 0 }}>{item.label}</span>
                <span style={{ color: '#1e293b' }}>{item.value}</span>
              </div>
            ))}
            {/* 가능한 전이만 노출한다 — 불가능한 전이 CTA 를 그리지 않는다. */}
            {transitionsFor(selectedItem.status).length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                {transitionsFor(selectedItem.status).map((t) => (
                  <button
                    key={t.to}
                    onClick={async () => {
                      const target = selectedItem;
                      setSelectedItem(null);
                      await handleTransition(target, t);
                    }}
                    style={drawerActionBtnStyle}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
              <a href={detailLinkPath(selectedItem.id)} style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>
                상세 페이지 이동 →
              </a>
            </div>
          </div>
        )}
      </BaseDetailDrawer>

      {/* 등록/편집 Form (lifecycle.form 이 있는 원장만) */}
      {lifecycle.form && (canCreate || canEdit) && (
        <ResourcesFormModal
          open={formOpen}
          config={lifecycle.form}
          initial={formInitial}
          loading={formLoading}
          onClose={closeForm}
          error={formError}
          onSubmit={handleFormSubmit}
          nouns={nouns}
        />
      )}

      {/* AI Modal slot (옵션) */}
      {aiSlot && aiSlot.render({
        open: aiOpen,
        onClose: () => setAiOpen(false),
        onSaved: () => { if (aiScope.mounted) { setAiOpen(false); setNotice(`${nouns.entity} 저장이 완료되었습니다`); void refreshAfterWrite(); } },
      })}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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

const createBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  backgroundColor: '#2563eb',
  color: '#fff',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  border: 'none',
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

const drawerActionBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  fontSize: 13,
  color: '#334155',
  backgroundColor: '#fff',
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
