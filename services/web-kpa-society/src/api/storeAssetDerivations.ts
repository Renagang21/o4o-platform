/**
 * Store Asset Derivations API Client
 *
 * WO-KPA-STORE-ASSET-DERIVATION-VIEWER-UI-V1
 *
 * 원본(source) ↔ 파생 결과물(derived) 관계 조회 (읽기 전용).
 * Endpoint: GET /api/v1/kpa/store/asset-derivations (org 격리는 서버에서 처리)
 *   - derivedKind + derivedId : 결과물 기준 원본 역추적
 *   - sourceKind + sourceId   : 원본 기준 파생 결과
 */

import { apiClient } from './client';

export interface StoreAssetDerivation {
  id: string;
  serviceKey: string;
  organizationId: string;
  sourceKind: string;
  sourceId: string;
  sourceTitle?: string | null;
  derivedKind: string;
  derivedId: string;
  derivedTitle?: string | null;
  createdAt: string;
}

export async function getStoreAssetDerivations(params: {
  sourceKind?: string;
  sourceId?: string;
  derivedKind?: string;
  derivedId?: string;
}): Promise<{ success: boolean; data: { items: StoreAssetDerivation[] } }> {
  const qs = new URLSearchParams();
  if (params.sourceKind) qs.set('sourceKind', params.sourceKind);
  if (params.sourceId) qs.set('sourceId', params.sourceId);
  if (params.derivedKind) qs.set('derivedKind', params.derivedKind);
  if (params.derivedId) qs.set('derivedId', params.derivedId);
  return apiClient.get(`/store/asset-derivations?${qs.toString()}`);
}
