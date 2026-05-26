/**
 * Operator Stores Page — Store Console (K-Cosmetics)
 *
 * WO-O4O-OPERATOR-STORES-LIST-CANONICALIZATION-V1:
 *   기존 ~370 라인 → ~110 라인. GlycoPharm Step 1 패턴 답습.
 *
 * 보존:
 *   - 검색 / pagination / row click 동작
 *   - subtitle "O4O 플랫폼 매장 카탈로그"
 *   - colorScheme pink (K-Cosmetics 톤)
 *   - slug 컬럼 (columns override)
 */

import { useNavigate } from 'react-router-dom';
import { OperatorStoresList } from '@o4o/operator-core-ui';
import type {
  StoresApi,
  StoresConfig,
  StoresListResponse,
  OperatorStoreBase,
} from '@o4o/operator-core-ui';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { api } from '../../lib/apiClient';

// ─── K-Cosmetics HTTP adapter (axios 래퍼 — baseURL /api/v1) ──

async function apiFetch<T>(path: string): Promise<T> {
  const url = path.replace(/^\/api\/v1/, '') || '/';
  const response = await api.get(url);
  return response.data;
}

const kCosStoresApi: StoresApi = {
  listStores: (params) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.sortBy) qs.set('sortBy', params.sortBy);
    if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
    if (params.search) qs.set('search', params.search);
    qs.set('serviceKey', 'k-cosmetics');
    return apiFetch<StoresListResponse>(`/api/v1/operator/stores?${qs.toString()}`);
  },
  getStore: (id) => apiFetch(`/api/v1/operator/stores/${id}`),
};

// ─── K-Cosmetics config ──────────────────────────────────────

const kCosStoresConfig: StoresConfig = {
  serviceKey: 'k-cosmetics',
  terminology: { storeLabel: '매장' },
  colorScheme: 'pink',
  typeLabels: {
    pharmacy: '약국',
    store: '매장',
    branch: '지점',
  },
};

// ─── K-Cosmetics columns (slug 컬럼 포함) ────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return '-';
  }
}

const kCosColumns: ListColumnDef<OperatorStoreBase>[] = [
  {
    key: 'name',
    header: '매장명',
    sortable: true,
    render: (_v, row) => (
      <div>
        <p className="font-medium text-slate-800 text-sm">{row.name}</p>
        {row.type && (
          <p className="text-xs text-slate-400 mt-0.5">
            {kCosStoresConfig.typeLabels?.[row.type] ?? row.type}
          </p>
        )}
      </div>
    ),
  },
  {
    key: 'code',
    header: '코드',
    width: '100px',
    render: (v) => (
      <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
        {v || '-'}
      </span>
    ),
  },
  {
    key: 'slug',
    header: 'Slug',
    width: '130px',
    render: (v) => v
      ? <span className="font-mono text-xs text-pink-600">{v}</span>
      : <span className="text-slate-300">-</span>,
  },
  {
    key: 'ownerName',
    header: '운영자',
    render: (_v, row) => row.ownerName ? (
      <div>
        <p className="text-sm text-slate-700">{row.ownerName}</p>
        {row.ownerEmail && <p className="text-xs text-slate-400">{row.ownerEmail}</p>}
      </div>
    ) : (
      <span className="text-sm text-slate-300">-</span>
    ),
  },
  {
    key: 'channelCount',
    header: '채널',
    align: 'center',
    width: '60px',
    sortable: true,
    render: (v) => (
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
        v > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
      }`}>
        {v}
      </span>
    ),
  },
  {
    key: 'productCount',
    header: '상품',
    align: 'center',
    width: '60px',
    sortable: true,
    render: (v) => (
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
        v > 0 ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-400'
      }`}>
        {v}
      </span>
    ),
  },
  {
    key: 'isActive',
    header: '상태',
    align: 'center',
    width: '80px',
    render: (v) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        v ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
      }`}>
        {v ? '활성' : '비활성'}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: '생성일',
    width: '110px',
    sortable: true,
    sortAccessor: (row) => new Date(row.createdAt).getTime(),
    render: (v) => <span className="text-sm text-slate-500">{formatDate(v)}</span>,
  },
];

// ─── Page (thin wrapper) ─────────────────────────────────────

export default function StoresPage() {
  const navigate = useNavigate();
  return (
    <OperatorStoresList
      api={kCosStoresApi}
      config={kCosStoresConfig}
      columns={kCosColumns}
      onRowClick={(row) => navigate(`/operator/stores/${row.id}`)}
      subtitle="O4O 플랫폼 매장 카탈로그"
      tableId="k-cosmetics-stores"
    />
  );
}
