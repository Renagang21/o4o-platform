/**
 * SupplierContentInbox — 서비스 운영자 "제공받은 콘텐츠" 수신함 (공통 모듈)
 *
 * WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1 (2026-09-16)
 *
 * `Supplier → Service Operator` 제공 경로(ROLE-WORKSPACE-ARCHITECTURE §2-1)의 **수신 측** 화면.
 * 공급자가 supplier-library 에서 서비스를 골라 제공하면 `SupplierContentService.submit` 이
 * `cms_contents(serviceKey=<서비스 물리 키>, authorRole='supplier', status='pending')` 행을 만든다.
 * 이 화면은 그 행을 **서비스 경계 안에서** 그대로 읽는다 — 새 원장 · 전송 엔진 · workflow 없음.
 *
 * 계약:
 *   - 목록: GET {apiBase}/cms/contents?serviceKey=<cmsServiceKey>&authorRole=supplier[&status=…]
 *     (공통 CMS read 경계 = serviceKey. 다른 서비스 행은 서버가 돌려주지 않는다.)
 *   - 상세: GET {apiBase}/cms/contents/:id
 *   - 처리: PATCH {apiBase}/cms/contents/:id/status — **기존** 공통 CMS 상태 전이(pending→published|draft,
 *     published→archived)이며 서비스 운영자 권한은 서버 `authorizeCmsMutation` 이 판정한다.
 *     받았다고 승인 상태 기계를 강제하지 않는다: 운영자는 검토 후 게시 · 보류(초안) · 보관 중 하나를
 *     고르거나 그대로 둘 수 있다. KPA 처럼 자체 승인 정책(kpa_approval_requests)이 있는 서비스는
 *     자기 화면을 계속 쓴다 — 이 모듈은 그런 정책을 대체하지 않는다.
 *
 * Props:
 *   apiBase        — `${VITE_API_BASE_URL}/api/v1` 형태의 루트 (서비스 네임스페이스 아님)
 *   cmsServiceKey  — cms_contents.serviceKey 조회 키 (canonical 키. KPA 는 'kpa-society' 로 조회하면 legacy 'kpa' 도 포함)
 *   getToken       — Bearer 토큰 제공자
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, Loader2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { BaseDetailDrawer } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';

export interface SupplierContentInboxProps {
  apiBase: string;
  cmsServiceKey: string;
  getToken: () => string | null;
  /** 화면 제목 (기본: 제공받은 콘텐츠) */
  title?: string;
}

type InboxStatus = 'pending' | 'draft' | 'published' | 'archived';

export interface SupplierInboxItem {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  status: InboxStatus;
  authorRole: string;
  serviceKey?: string;
  publishedAt: string | null;
  createdAt: string;
  body?: string | null;
}

const STATUS_LABEL: Record<InboxStatus, { label: string; cls: string }> = {
  pending: { label: '검토 대기', cls: 'bg-amber-50 text-amber-700' },
  draft: { label: '보류', cls: 'bg-slate-100 text-slate-600' },
  published: { label: '게시', cls: 'bg-emerald-50 text-emerald-700' },
  archived: { label: '보관', cls: 'bg-gray-100 text-gray-500' },
};

/** 공통 CMS 전이표(CMS_ALLOWED_TRANSITIONS)의 부분집합만 노출한다 — 서버가 최종 재검증. */
const NEXT_ACTIONS: Record<InboxStatus, Array<{ status: InboxStatus; label: string; primary?: boolean }>> = {
  pending: [
    { status: 'published', label: '게시', primary: true },
    { status: 'draft', label: '보류(초안)' },
  ],
  draft: [{ status: 'pending', label: '검토 대기로' }],
  published: [{ status: 'archived', label: '보관' }],
  archived: [],
};

const PAGE_SIZE = 20;

function makeApiFetch(getToken: () => string | null) {
  return async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const token = getToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || `API error ${res.status}`);
    }
    return res.json();
  };
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
}

export function SupplierContentInbox({
  apiBase,
  cmsServiceKey,
  getToken,
  title = '제공받은 콘텐츠',
}: SupplierContentInboxProps) {
  const apiFetch = useMemo(() => makeApiFetch(getToken), [getToken]);

  const [items, setItems] = useState<SupplierInboxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'' | InboxStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SupplierInboxItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        serviceKey: cmsServiceKey,
        authorRole: 'supplier',
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch<{ data: SupplierInboxItem[]; pagination?: { total: number } }>(
        `${apiBase}/cms/contents?${params}`,
      );
      // 클라이언트 방어선: 서버가 serviceKey 로 경계를 지키지만, 다른 서비스 행이 섞여 오면 표시하지 않는다.
      const rows = (res.data ?? []).filter((r) => r.authorRole === 'supplier');
      setItems(rows);
      setTotal(res.pagination?.total ?? rows.length);
    } catch (e: any) {
      setError(e.message || '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, apiFetch, cmsServiceKey, page, statusFilter, refreshKey]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function openDetail(row: SupplierInboxItem) {
    setSelected(row);
    setDetailLoading(true);
    try {
      const res = await apiFetch<{ data: SupplierInboxItem }>(`${apiBase}/cms/contents/${row.id}`);
      setSelected({ ...row, ...res.data });
    } catch {
      /* 목록 데이터로 표시 */
    } finally {
      setDetailLoading(false);
    }
  }

  async function transition(row: SupplierInboxItem, next: InboxStatus) {
    setActing(row.id);
    try {
      await apiFetch(`${apiBase}/cms/contents/${row.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      setToast(`"${row.title}" → ${STATUS_LABEL[next].label}`);
      setSelected(null);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setToast(e.message || '처리하지 못했습니다.');
    } finally {
      setActing(null);
    }
  }

  const columns: ListColumnDef<SupplierInboxItem>[] = [
    {
      key: 'title',
      header: '제목',
      stickyOnMobile: true,
      render: (_v, row) => (
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-800 truncate">{row.title}</div>
          {row.summary && <div className="text-xs text-slate-500 truncate">{row.summary}</div>}
        </div>
      ),
    },
    {
      key: 'type',
      header: '유형',
      width: '90px',
      render: (v) => <span className="text-xs text-slate-600">{String(v)}</span>,
    },
    {
      key: 'status',
      header: '상태',
      width: '100px',
      render: (v) => {
        const sc = STATUS_LABEL[v as InboxStatus] ?? { label: String(v), cls: 'bg-slate-100 text-slate-600' };
        return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${sc.cls}`}>{sc.label}</span>;
      },
    },
    {
      key: 'createdAt',
      header: '제공일',
      width: '110px',
      render: (v) => <span className="text-xs text-slate-600">{fmtDate(v)}</span>,
    },
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-slate-500" />
            {title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            공급자가 이 서비스에 제공한 콘텐츠입니다. 검토 후 게시하거나 보류할 수 있으며, 다른 서비스로 제공된 콘텐츠는 여기에 나타나지 않습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as '' | InboxStatus);
              setPage(1);
            }}
            className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white"
          >
            <option value="pending">검토 대기</option>
            <option value="draft">보류</option>
            <option value="published">게시</option>
            <option value="archived">보관</option>
            <option value="">전체</option>
          </select>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" /> 새로고침
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <DataTable<SupplierInboxItem>
        tableId={`${cmsServiceKey}-supplier-content-inbox`}
        columns={columns}
        data={items}
        rowKey="id"
        loading={loading}
        onRowClick={openDetail}
        emptyMessage={
          statusFilter === 'pending'
            ? '검토 대기 중인 제공 콘텐츠가 없습니다.'
            : '해당 상태의 제공 콘텐츠가 없습니다.'
        }
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm text-slate-600">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            이전
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}

      {selected && (
        <BaseDetailDrawer
          open
          onClose={() => setSelected(null)}
          title={selected.title}
          actions={NEXT_ACTIONS[selected.status]?.map((a) => ({
            label: a.label,
            variant: a.primary ? ('primary' as const) : ('default' as const),
            onClick: () => transition(selected, a.status),
            disabled: acting === selected.id,
          }))}
        >
          {detailLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_LABEL[selected.status]?.cls ?? ''}`}>
                  {STATUS_LABEL[selected.status]?.label ?? selected.status}
                </span>
                <span className="text-xs text-slate-500">유형 {selected.type}</span>
                <span className="text-xs text-slate-500">공급자 제공 · {fmtDate(selected.createdAt)}</span>
              </div>
              {selected.summary && <p className="text-slate-700 whitespace-pre-wrap">{selected.summary}</p>}
              {selected.imageUrl && (
                <img src={selected.imageUrl} alt="" className="max-w-full rounded-lg border border-slate-200" />
              )}
              {selected.linkUrl && (
                <a
                  href={selected.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" /> 원본 자료 열기
                </a>
              )}
              {selected.body && (
                <details className="rounded-lg border border-slate-200 p-3">
                  <summary className="cursor-pointer text-slate-600">본문 데이터</summary>
                  <pre className="mt-2 text-xs whitespace-pre-wrap break-words text-slate-600">{selected.body}</pre>
                </details>
              )}
              <p className="text-xs text-slate-400">
                게시하면 이 서비스의 콘텐츠로 노출됩니다. 수정이 필요하면 보류한 뒤 콘텐츠 관리 화면에서 편집하세요.
              </p>
            </div>
          )}
        </BaseDetailDrawer>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
