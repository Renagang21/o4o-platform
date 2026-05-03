/**
 * OperatorStoresPage — 매장 관리 목록 (KPA)
 *
 * WO-O4O-STORE-HUB-OPERATOR-INTEGRATION-V1
 * WO-O4O-TABLE-STANDARD-V1
 * WO-O4O-OPERATOR-STORES-CORE-EXTRACTION-V1: @o4o/operator-core-ui 의 OperatorStoresList 로 thin wrapper 화.
 *   기존 페이지 로직 ~380 라인 → ~50 라인 (어댑터 + thin wrapper)
 */

import { useNavigate } from 'react-router-dom';
import { OperatorStoresList } from '@o4o/operator-core-ui';
import type { StoresApi, StoresConfig, StoresListResponse } from '@o4o/operator-core-ui';
import { getAccessToken } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// ─── KPA Store type (Core base 와 호환) ─────────────────────────────────────
// Core OperatorStoreBase 와 동일 형태. 향후 KPA 전용 필드 추가 시 extends 로 확장.

// ─── KPA HTTP wrapper (apiClient 가 /api/v1/kpa baseURL 이라 직접 fetch 사용 — 기존 패턴 유지) ─

async function apiFetch<T>(path: string): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || body?.message || `API error ${res.status}`);
  }
  return res.json();
}

// ─── StoresApi adapter ─────────────────────────────────────────────────────

const kpaStoresApi: StoresApi = {
  listStores: (params) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.sortBy) qs.set('sortBy', params.sortBy);
    if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
    if (params.search) qs.set('search', params.search);
    return apiFetch<StoresListResponse>(`/api/v1/operator/stores?${qs.toString()}`);
  },
  getStore: (id) => apiFetch(`/api/v1/operator/stores/${id}`),
};

// ─── KPA config (terminology / typeLabels / colorScheme) ───────────────────

const kpaStoresConfig: StoresConfig = {
  serviceKey: 'kpa-society',
  terminology: { storeLabel: '매장' },
  colorScheme: 'slate',
  typeLabels: {
    pharmacy: '약국',
    store: '매장',
    branch: '지점',
  },
};

// ─── Page (thin wrapper) ───────────────────────────────────────────────────

export default function OperatorStoresPage() {
  const navigate = useNavigate();
  return (
    <OperatorStoresList
      api={kpaStoresApi}
      config={kpaStoresConfig}
      onRowClick={(row) => navigate(`/operator/stores/${row.id}`)}
      tableId="kpa-stores"
    />
  );
}
