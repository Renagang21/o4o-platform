/**
 * OperatorStoreChannelsPage — Cross-store 채널 관리 (GlycoPharm)
 *
 * WO-O4O-STORE-CHANNEL-LIFECYCLE-V1: 상태 변경 APPROVED ↔ SUSPENDED → TERMINATED.
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
 *   KPA · K-Cosmetics 와 3중복이던 화면 본체를
 *   @o4o/operator-core-ui/modules/store-channels 공통 콘솔로 수렴.
 *   서비스는 client adapter + accent + actionPolicyKey 만 주입 (endpoint·상태머신 불변).
 *
 * Backend 변경 없음:
 *   GET /api/v1/operator/stores/channels (injectServiceScope → glycopharm 자동 격리)
 *   PUT /api/v1/operator/stores/:storeId/channels/:channelId/status
 *
 * axios wrapper 사용 (GlycoPharm — api base 가 이미 `/api/v1` 를 포함하므로 prefix 제거).
 */

import { useNavigate } from 'react-router-dom';
import { OperatorStoreChannelsPage as CommonStoreChannelsPage } from '@o4o/operator-core-ui/modules/store-channels';
import type {
  StoreChannelsClient,
  StoreChannelListResult,
} from '@o4o/operator-core-ui/modules/store-channels';
import { api } from '../../../lib/apiClient';

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

const glycopharmChannelsClient: StoreChannelsClient = {
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
      client={glycopharmChannelsClient}
      actionPolicyKey="glycopharm:store-channels"
      tableId="glycopharm-store-channels-list"
      description="GlycoPharm 약국의 채널 상태를 관리합니다"
      onStoreClick={(storeId) => navigate(`/operator/stores/${storeId}`)}
      accent={{
        storeLinkHover: 'hover:text-green-600',
        focusRing: 'focus:ring-green-500',
        searchButton: 'bg-slate-700 hover:bg-slate-800',
        activePage: 'bg-slate-700 text-white',
        approvedCountText: 'text-green-600',
        approvedBadge: { bg: 'bg-green-100', text: 'text-green-700' },
      }}
    />
  );
}
