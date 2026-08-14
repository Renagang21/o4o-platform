/**
 * OperatorStoreChannelsPage — Cross-store 채널 관리 (KPA)
 *
 * WO-O4O-STORE-CHANNEL-LIFECYCLE-V1:
 *   /api/v1/operator/stores/channels 기반 cross-store 채널 목록.
 *   상태 변경: APPROVED ↔ SUSPENDED → TERMINATED.
 * WO-O4O-OPERATOR-LIST-TABLE-STANDARD-V3-PHASE3B-1: DataTable + ActionPolicy 표준.
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   K-Cosmetics/GlycoPharm 과 3중복이던 화면 본체를 @o4o/operator-core-ui 공통 콘솔로 수렴.
 *   서비스는 client adapter + accent + actionPolicyKey 만 주입 (endpoint·상태머신 불변).
 *
 * Bearer token auth (KPA — getAccessToken 사용).
 */

import { useNavigate } from 'react-router-dom';
import { OperatorStoreChannelsPage as CommonStoreChannelsPage } from '@o4o/operator-core-ui/modules/store-channels';
import type {
  StoreChannelsClient,
  StoreChannelListResult,
} from '@o4o/operator-core-ui/modules/store-channels';
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
    throw new Error(body?.error || `API error ${res.status}`);
  }
  return res.json();
}

const kpaChannelsClient: StoreChannelsClient = {
  list: (params) => {
    const usp = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
    if (params.search) usp.set('search', params.search);
    if (params.status) usp.set('status', params.status);
    if (params.channelType) usp.set('channelType', params.channelType);
    return apiFetch<StoreChannelListResult>(`/api/v1/operator/stores/channels?${usp}`);
  },
  updateStatus: async (storeId, channelId, status) => {
    await apiFetch(`/api/v1/operator/stores/${storeId}/channels/${channelId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};

export default function OperatorStoreChannelsPage() {
  const navigate = useNavigate();
  return (
    <CommonStoreChannelsPage
      client={kpaChannelsClient}
      actionPolicyKey="kpa:store-channels"
      tableId="kpa-store-channels"
      description="전체 매장의 채널 상태를 관리합니다"
      onStoreClick={(storeId) => navigate(`/operator/stores/${storeId}`)}
      accent={{
        storeLinkHover: 'hover:text-blue-600',
        focusRing: 'focus:ring-blue-500',
        searchButton: 'bg-slate-700 hover:bg-slate-800',
        activePage: 'bg-slate-700 text-white',
        approvedCountText: 'text-green-600',
        approvedBadge: { bg: 'bg-green-100', text: 'text-green-700' },
      }}
    />
  );
}
