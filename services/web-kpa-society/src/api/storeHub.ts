/**
 * Store Hub API — 통합 매장 허브 (KPA)
 *
 * WO-STORE-HUB-UNIFIED-RENDERING-PHASE1-V1
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1 (census F1):
 *   3 서비스가 동일한 `/store-hub/*` endpoint 목록·응답 형상·fallback 을 각각 복제하고 있었다
 *   (backend 는 이미 `createStoreHubController` factory 로 공용). endpoint 계약을
 *   `@o4o/store-ui-core` 의 `createStoreHubApi` 로 모으고, 이 파일은 **전송 계층 주입 +
 *   기존 함수명 유지**만 소유한다. 경로·응답·호출부 무변경.
 *   `apiClient` 는 base `/api/v1/kpa` 이며 이미 body 를 반환하므로 언랩이 필요 없다.
 *
 * 채널 활성화(`createChannel`)는 KPA 자체 storefront(B2C) 은퇴로 프런트 진입점이 없다
 * (WO-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1). backend 는 3 서비스 공용이라 유지되며
 * kpa + B2C 조합만 410 STORE_B2C_CHANNEL_RETIRED 로 차단된다 → 여기서 re-export 하지 않는다.
 */

import { createStoreHubApi } from '@o4o/store-ui-core';
import { apiClient } from './client';

export type {
  StoreHubOverview,
  ChannelType,
  ChannelStatus,
  ChannelOverview,
  ChannelOverviewWithCode,
  StoreKpiSummary,
  LiveSignals,
  StoreCapabilityOverview,
  StoreSlugStatus,
  StoreSlugChangeResult,
  StoreSlugErrorCode,
} from '@o4o/store-ui-core';

const storeHubApi = createStoreHubApi({
  get: (url) => apiClient.get(url),
  post: (url, body) => apiClient.post(url, body),
  patch: (url, body) => apiClient.patch(url, body),
});

export const fetchStoreHubOverview = storeHubApi.fetchOverview;
export const fetchChannelOverview = storeHubApi.fetchChannels;
export const fetchChannelOverviewWithCode = storeHubApi.fetchChannelsWithCode;
export const fetchStoreKpiSummary = storeHubApi.fetchKpiSummary;
export const fetchLiveSignals = storeHubApi.fetchLiveSignals;
export const fetchStoreCapabilities = storeHubApi.fetchCapabilities;
export const fetchStoreSlugStatus = storeHubApi.fetchSlugStatus;

/**
 * 매장 slug 변경. 전송 계층이 4xx/5xx 응답을 throw — 호출처는 try/catch 로 `.code` 분기.
 */
export const updateStoreSlug = storeHubApi.updateSlug;
