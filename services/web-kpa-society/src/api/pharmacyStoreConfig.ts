/**
 * Pharmacy Store Config API Client
 *
 * WO-PHARMACY-HUB-REALIGN-PHASEH2-V1
 *
 * GET  /pharmacy/store/config — 현재 매장 설정 조회
 * PUT  /pharmacy/store/config — 매장 설정 저장
 */

import { apiClient } from './client';

export interface StorefrontConfig {
  template?: string;
  theme?: string;
  components?: Record<string, boolean>;
  [key: string]: unknown;
}

export interface StoreConfigResponse {
  organizationId: string;
  organizationName: string;
  storefrontConfig: StorefrontConfig;
}

/**
 * 현재 매장 설정 조회
 */
export async function getStoreConfig(): Promise<StoreConfigResponse> {
  const response = await apiClient.get<{ success: boolean; data: StoreConfigResponse }>(
    '/pharmacy/store/config'
  );
  return response.data;
}

/**
 * 매장 설정 저장 (전체 overwrite)
 */
export async function saveStoreConfig(config: StorefrontConfig): Promise<StoreConfigResponse> {
  const response = await apiClient.put<{ success: boolean; data: StoreConfigResponse }>(
    '/pharmacy/store/config',
    config
  );
  return response.data;
}
