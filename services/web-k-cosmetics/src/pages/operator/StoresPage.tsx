/**
 * Operator Stores Page — Store Console (K-Cosmetics)
 *
 * WO-O4O-OPERATOR-STORES-LIST-CANONICALIZATION-V1: 기존 ~370 라인 → ~110 라인.
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   slug 컬럼 하나 때문에 core 기본 컬럼 전체를 복제하던 106 LOC override 제거.
 *   slug 노출 / slug accent / 상품 배지 톤을 StoresConfig 로 주입한다.
 *
 * 보존:
 *   - 검색 / pagination / row click 동작
 *   - subtitle "O4O 플랫폼 매장 카탈로그"
 *   - colorScheme pink (K-Cosmetics 톤) · slug 컬럼 · 상품 배지 pink
 */

import { useNavigate } from 'react-router-dom';
import { OperatorStoresList } from '@o4o/operator-core-ui';
import type { StoresApi, StoresConfig, StoresListResponse } from '@o4o/operator-core-ui';
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
  // WO-O4O-KCOSMETICS-OPERATOR-VOCABULARY-PHARMACY-CLEANUP-V2:
  //   pharmacy: '약국' typeLabel 제거. Tier 5 §4 데이터 검증으로 cosmetics
  //   storeType=pharmacy 사용 근거 없음 확인. K-Cosmetics 도메인 어휘 정합.
  typeLabels: {
    store: '매장',
    branch: '지점',
  },
  showSlugColumn: true,
  slugTextClass: 'text-pink-600',
  productCountTone: 'pink',
};

// ─── Page (thin wrapper) ─────────────────────────────────────

export default function StoresPage() {
  const navigate = useNavigate();
  return (
    <OperatorStoresList
      api={kCosStoresApi}
      config={kCosStoresConfig}
      onRowClick={(row) => navigate(`/operator/stores/${row.id}`)}
      subtitle="O4O 플랫폼 매장 카탈로그"
      tableId="k-cosmetics-stores"
    />
  );
}
