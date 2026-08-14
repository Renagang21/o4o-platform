/**
 * OperatorStoreChannelsPage — Cross-store 채널 관리 (K-Cosmetics 운영자)
 *
 * WO-O4O-KCOSMETICS-OPERATOR-STORE-CHANNELS-V1
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   KPA/GlycoPharm 과 3중복이던 화면 본체를 @o4o/operator-core-ui 공통 콘솔로 수렴.
 *   서비스는 client adapter + accent(pink/emerald) + actionPolicyKey 만 주입.
 *
 * Backend: GET /api/v1/operator/stores/channels (injectServiceScope → k-cosmetics 자동 격리)
 *          PUT /api/v1/operator/stores/:storeId/channels/:channelId/status
 * Guard: stores.routes.ts에서 cosmetics:operator 허용, serviceKey 자동 필터링
 */

import { useNavigate } from 'react-router-dom';
import { OperatorStoreChannelsPage as CommonStoreChannelsPage } from '@o4o/operator-core-ui/modules/store-channels';
import type { StoreChannelsClient } from '@o4o/operator-core-ui/modules/store-channels';
import { api } from '../../../lib/apiClient';

const kcosChannelsClient: StoreChannelsClient = {
  list: async (params) => {
    const query: Record<string, string> = {
      page: String(params.page),
      limit: String(params.limit),
    };
    if (params.search) query.search = params.search;
    if (params.status) query.status = params.status;
    if (params.channelType) query.channelType = params.channelType;
    const { data } = await api.get('/operator/stores/channels', { params: query });
    return data;
  },
  updateStatus: async (storeId, channelId, status) => {
    await api.put(`/operator/stores/${storeId}/channels/${channelId}/status`, { status });
  },
};

export default function OperatorStoreChannelsPage() {
  const navigate = useNavigate();
  return (
    <CommonStoreChannelsPage
      client={kcosChannelsClient}
      actionPolicyKey="cosmetics:store-channels"
      tableId="kcos-store-channels"
      description="K-Cosmetics 매장의 채널 상태를 관리합니다"
      onStoreClick={(storeId) => navigate(`/operator/stores/${storeId}`)}
      toastOnStatusChange
      accent={{
        storeLinkHover: 'hover:text-pink-600',
        focusRing: 'focus:ring-pink-500',
        searchButton: 'bg-pink-600 hover:bg-pink-700',
        activePage: 'bg-pink-600 text-white',
        approvedCountText: 'text-emerald-600',
        approvedBadge: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
      }}
    />
  );
}
