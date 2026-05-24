/**
 * Operator Stores Page — Store Console (GlycoPharm)
 *
 * WO-O4O-OPERATOR-STORES-STEP3-GLYCO-V1: @o4o/operator-core-ui 의 OperatorStoresList thin wrapper.
 *   기존 ~300 라인 → ~110 라인. KPA Step 1 패턴 답습.
 *
 * 보존:
 *   - 검색 / pagination / row click 동작
 *   - subtitle "O4O 플랫폼 매장 카탈로그"
 *   - colorScheme primary (Glyco 톤)
 *   - slug 컬럼 (Glyco 만 표시) — columns override
 *
 * 비고:
 *   - StatusBadge (활성/비활성) 색상 토큰이 core 기본값과 동일하여 inline 렌더 사용
 *   - PageHeader 의 Store 아이콘은 core 표준 헤더에 슬롯이 없어 생략 (KPA Step 1 동일)
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

// ─── Glyco HTTP adapter (axios 래퍼 — baseURL /api/v1) ──────

async function apiFetch<T>(path: string): Promise<T> {
  const url = path.replace(/^\/api\/v1/, '') || '/';
  const response = await api.get(url);
  return response.data;
}

const glycoStoresApi: StoresApi = {
  listStores: (params) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.sortBy) qs.set('sortBy', params.sortBy);
    if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
    if (params.search) qs.set('search', params.search);
    // WO-O4O-OPERATOR-CONSOLE-SERVICEKEY-ALIGNMENT-V1:
    // F6 Boundary Policy platform admin 분기에서 serviceKey 가 없으면
    // PLATFORM_ADMIN_SCOPE_REQUIRED 400 — 명시적으로 전달.
    qs.set('serviceKey', 'glycopharm');
    return apiFetch<StoresListResponse>(`/api/v1/operator/stores?${qs.toString()}`);
  },
  getStore: (id) => apiFetch(`/api/v1/operator/stores/${id}`),
};

// ─── Glyco config (terminology / typeLabels / colorScheme) ───

const glycoStoresConfig: StoresConfig = {
  serviceKey: 'glycopharm',
  terminology: { storeLabel: '매장' },
  colorScheme: 'primary',
  typeLabels: {
    pharmacy: '약국',
    store: '매장',
    branch: '지점',
  },
};

// ─── Glyco columns (slug 컬럼 보존을 위해 override) ─────────

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

const glycoColumns: ListColumnDef<OperatorStoreBase>[] = [
  {
    key: 'name',
    header: '매장명',
    sortable: true,
    render: (_v, row) => (
      <div>
        <p className="font-medium text-slate-800 text-sm">{row.name}</p>
        {row.type && (
          <p className="text-xs text-slate-400 mt-0.5">
            {glycoStoresConfig.typeLabels?.[row.type] ?? row.type}
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
      ? <span className="font-mono text-xs text-primary-600">{v}</span>
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
        v > 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'
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
      api={glycoStoresApi}
      config={glycoStoresConfig}
      columns={glycoColumns}
      onRowClick={(row) => navigate(`/operator/stores/${row.id}`)}
      subtitle="O4O 플랫폼 매장 카탈로그"
      tableId="glycopharm-stores"
    />
  );
}
