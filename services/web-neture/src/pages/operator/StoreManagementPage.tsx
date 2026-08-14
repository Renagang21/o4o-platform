/**
 * StoreManagementPage — Neture 매장 관리
 *
 * WO-O4O-OPERATOR-STORES-LIST-CANONICALIZATION-V1: 기존 ~340 라인 → ~110 라인.
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   slug 컬럼 하나 때문에 core 기본 컬럼 전체를 복제하던 96 LOC override 제거.
 *   slug 노출 / slug accent 를 StoresConfig 로 주입한다.
 *
 * 보존:
 *   - 검색 / pagination / row click 동작
 *   - subtitle "O4O 플랫폼 매장 카탈로그"
 *   - colorScheme primary (Neture 톤) · slug 컬럼
 */

import { useNavigate } from 'react-router-dom';
import { OperatorStoresList } from '@o4o/operator-core-ui';
import type { StoresApi, StoresConfig, StoresListResponse } from '@o4o/operator-core-ui';
import { api } from '@/lib/apiClient';

// ─── Neture HTTP adapter (axios 래퍼 — baseURL /api/v1) ──────

async function apiFetch<T>(path: string): Promise<T> {
  const url = path.replace(/^\/api\/v1/, '') || '/';
  const response = await api.get(url);
  return response.data;
}

const netureStoresApi: StoresApi = {
  listStores: (params) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.sortBy) qs.set('sortBy', params.sortBy);
    if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
    if (params.search) qs.set('search', params.search);
    qs.set('serviceKey', 'neture');
    return apiFetch<StoresListResponse>(`/api/v1/operator/stores?${qs.toString()}`);
  },
  getStore: (id) => apiFetch(`/api/v1/operator/stores/${id}`),
};

// ─── Neture config ───────────────────────────────────────────

const netureStoresConfig: StoresConfig = {
  serviceKey: 'neture',
  terminology: { storeLabel: '매장' },
  colorScheme: 'primary',
  typeLabels: {
    store: '매장',
    branch: '지점',
  },
  showSlugColumn: true,
  slugTextClass: 'text-primary-600',
};

// ─── Page (thin wrapper) ─────────────────────────────────────

export default function StoreManagementPage() {
  const navigate = useNavigate();
  return (
    <OperatorStoresList
      api={netureStoresApi}
      config={netureStoresConfig}
      onRowClick={(row) => navigate(`/operator/stores/${row.id}`)}
      subtitle="O4O 플랫폼 매장 카탈로그"
      tableId="neture-stores"
    />
  );
}
