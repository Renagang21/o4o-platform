/**
 * StoreDetailPage — 매장 상세 (채널 + Capabilities + 상품) — GlycoPharm
 *
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
 *   KPA(공통 본체) · K-Cosmetics 가 이미 쓰던 @o4o/operator-core-ui/modules/store-detail 로 수렴.
 *   endpoint(`/api/v1/operator/stores/:storeId` 4축) · 데이터 모델은 기존 로컬 구현과 동일하다.
 *
 * ⚠ capability 변화 1건 (의도적, CHECK 에 기록):
 *   기존 GlycoPharm 로컬 화면은 채널 상태를 **배지로 읽기만** 했고 상태 전이 UI 가 없었다.
 *   공통 콘솔은 채널 상태 전이(updateChannelStatus)를 포함한다.
 *   backend `PUT /api/v1/operator/stores/:storeId/channels/:channelId/status` 의 guard 에
 *   `glycopharm:operator` 가 이미 포함돼 있으므로(stores.routes.ts:27) 권한은 신설이 아니라
 *   **이미 부여돼 있던 권한을 UI 로 노출**하는 것이다. API/DB/guard 변경 없음.
 *
 * axios wrapper 사용 (GlycoPharm — api base 가 이미 `/api/v1` 를 포함하므로 prefix 제거).
 */

import { useParams, useNavigate } from 'react-router-dom';
import { OperatorStoreDetailPage as CommonStoreDetailPage } from '@o4o/operator-core-ui/modules/store-detail';
import type { StoreDetailClient } from '@o4o/operator-core-ui/modules/store-detail';
import { api } from '../../lib/apiClient';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = path.replace(/^\/api\/v1/, '') || '/';
  const method = (options?.method || 'GET').toUpperCase();
  let body: any;
  if (options?.body && typeof options.body === 'string') {
    try { body = JSON.parse(options.body); } catch { body = options.body; }
  }
  const response = await api.request({ method, url, data: body });
  return response.data as T;
}

const glycopharmStoreDetailClient: StoreDetailClient = {
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

export default function StoreDetailPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  return (
    <CommonStoreDetailPage
      storeId={storeId}
      client={glycopharmStoreDetailClient}
      onBack={() => navigate('/operator/stores')}
      typeLabels={{ pharmacy: '약국', store: '매장', branch: '지점' }}
      capabilityOnClass="bg-green-500"
      spinnerClass="border-slate-600"
      tableIds={{ channels: 'glycopharm-store-channels', products: 'glycopharm-store-products' }}
    />
  );
}
