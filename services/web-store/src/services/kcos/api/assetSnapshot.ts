/**
 * Asset Snapshot API Client — K-Cosmetics
 *
 * WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1: Asset Snapshot copy/list (Store Asset Control 축은 WO-O4O-KCOS-STORE-CHANNEL-ASSET-TENANT-CANONICAL-CLOSURE-V1 에서 제거)
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 */

import { api } from '../lib/apiClient';

// ─── Asset Snapshot Copy (WO-O4O-SIGNAGE-STORE-ACTION-EXPANSION-V1) ───

interface CopyAssetRequest {
  sourceAssetId: string;
  assetType: 'cms' | 'signage';
}

interface CopyAssetResponse {
  success: boolean;
  data: {
    id: string;
    organizationId: string;
    sourceService: string;
    sourceAssetId: string;
    assetType: string;
    title: string;
    contentJson: Record<string, unknown>;
    createdBy: string;
    createdAt: string;
  };
}

// WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1: 내 자료함 콘텐츠 목록 조회
export interface AssetSnapshotItem {
  id: string;
  organizationId: string;
  sourceService: string;
  sourceAssetId: string;
  assetType: string;
  title: string;
  contentJson: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

interface PaginatedAssetSnapshots {
  items: AssetSnapshotItem[];
  total: number;
  page: number;
  limit: number;
}

export const assetSnapshotApi = {
  copy: async (body: CopyAssetRequest) => {
    const res = await api.post('/cosmetics/assets/copy', body);
    return res.data as CopyAssetResponse;
  },

  list: async (params?: { type?: string; page?: number; limit?: number }) => {
    const qp = new URLSearchParams();
    if (params?.type) qp.set('type', params.type);
    if (params?.page) qp.set('page', String(params.page));
    qp.set('limit', String(params?.limit ?? 100));
    const res = await api.get(`/cosmetics/assets?${qp.toString()}`);
    return res.data as { success: boolean; data: PaginatedAssetSnapshots };
  },
};

// ─── Store Asset Control ───────────────────────────


// WO-O4O-KCOS-STORE-CHANNEL-ASSET-TENANT-CANONICAL-CLOSURE-V1: storeAssetControlApi(/cosmetics/store-assets) 제거 —
//   KPA 전용 kpa_store_asset_controls 축. K-Cosmetics 는 이 축을 갖지 않으며 route 도 마운트하지 않는다.

