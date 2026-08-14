/**
 * StoreDetailPage — 매장 상세 (채널 + Capabilities + 상품) — K-Cosmetics
 *
 * WO-O4O-STORE-HUB-OPERATOR-INTEGRATION-V1
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   KPA 와 중복이던 화면 본체를 @o4o/operator-core-ui 공통 콘솔로 수렴.
 *   endpoint · 데이터 모델 · 조작(채널 상태 전이, capability 토글)은 그대로다.
 *   수렴으로 획득: DataTable 표준(OPERATOR-DATATABLE-POLICY-V1) · 섹션별 오류/재시도 ·
 *   상품 더보기 페이징 · 영구 종료 확인 게이트.
 *
 * WO-O4O-KCOSMETICS-OPERATOR-VOCABULARY-PHARMACY-CLEANUP-V2:
 *   typeLabels 에 pharmacy: '약국' 없음 — StoresPage 와 정합 (K-Cosmetics 도메인 어휘).
 */

import { useParams, useNavigate } from 'react-router-dom';
import { OperatorStoreDetailPage as CommonStoreDetailPage } from '@o4o/operator-core-ui/modules/store-detail';
import type { StoreDetailClient } from '@o4o/operator-core-ui/modules/store-detail';
import { api } from '../../lib/apiClient';

// K-Cosmetics apiClient 는 baseURL 이 /api/v1 이므로 prefix 를 제거해 호출한다.
async function apiGet<T>(path: string): Promise<T> {
  const { data } = await api.get(path);
  return data;
}

const kcosStoreDetailClient: StoreDetailClient = {
  getStore: (storeId) => apiGet(`/operator/stores/${storeId}`),
  getChannels: (storeId) => apiGet(`/operator/stores/${storeId}/channels`),
  getCapabilities: (storeId) => apiGet(`/operator/stores/${storeId}/capabilities`),
  getProducts: (storeId, page, limit) =>
    apiGet(`/operator/stores/${storeId}/products?page=${page}&limit=${limit}`),
  toggleCapability: async (storeId, key, enabled) => {
    await api.put(`/operator/stores/${storeId}/capabilities`, {
      capabilities: [{ key, enabled }],
    });
  },
  updateChannelStatus: async (storeId, channelId, status) => {
    await api.put(`/operator/stores/${storeId}/channels/${channelId}/status`, { status });
  },
};

export default function StoreDetailPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  return (
    <CommonStoreDetailPage
      storeId={storeId}
      client={kcosStoreDetailClient}
      onBack={() => navigate('/operator/stores')}
      typeLabels={{ store: '매장', branch: '지점' }}
      capabilityOnClass="bg-pink-500"
      spinnerClass="border-pink-600"
    />
  );
}
