/**
 * OperatorStoreDetailPage — 매장 상세 (채널 + Capabilities + 상품) — KPA
 *
 * WO-O4O-STORE-HUB-OPERATOR-INTEGRATION-V1 · WO-O4O-KPA-OPERATOR-LOAD-ERROR-AND-REMAINING-LISTS-CONSOLIDATED-V1
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   K-Cosmetics 와 중복이던 화면 본체를 @o4o/operator-core-ui 공통 콘솔로 수렴.
 *   4축 독립 로드/오류/재시도 · DataTable · 상품 더보기 · 영구종료 확인 게이트 계약은
 *   본 KPA 구현이 공통 본체가 되었으므로 그대로 보존된다.
 *
 * Bearer token auth (KPA — getAccessToken 사용).
 */

import { useParams, useNavigate } from 'react-router-dom';
import { OperatorStoreDetailPage as CommonStoreDetailPage } from '@o4o/operator-core-ui/modules/store-detail';
import type { StoreDetailClient } from '@o4o/operator-core-ui/modules/store-detail';
import { getAccessToken } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || body?.message || `API error ${res.status}`);
  }
  return res.json();
}

const kpaStoreDetailClient: StoreDetailClient = {
  getStore: (storeId) => apiFetch(`/api/v1/operator/stores/${storeId}`),
  getChannels: (storeId) => apiFetch(`/api/v1/operator/stores/${storeId}/channels`),
  getCapabilities: (storeId) => apiFetch(`/api/v1/operator/stores/${storeId}/capabilities`),
  getProducts: (storeId, page, limit) =>
    apiFetch(`/api/v1/operator/stores/${storeId}/products?page=${page}&limit=${limit}`),
  toggleCapability: async (storeId, key, enabled) => {
    await apiFetch(`/api/v1/operator/stores/${storeId}/capabilities`, {
      method: 'PUT',
      body: JSON.stringify({ capabilities: [{ key, enabled }] }),
    });
  },
  updateChannelStatus: async (storeId, channelId, status) => {
    await apiFetch(`/api/v1/operator/stores/${storeId}/channels/${channelId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};

export default function OperatorStoreDetailPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  return (
    <CommonStoreDetailPage
      storeId={storeId}
      client={kpaStoreDetailClient}
      onBack={() => navigate('/operator/stores')}
      typeLabels={{ pharmacy: '약국', store: '매장', branch: '지점' }}
      capabilityOnClass="bg-green-500"
      spinnerClass="border-slate-600"
    />
  );
}
