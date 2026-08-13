/**
 * Store Hub API — GlycoPharm 통합 매장 허브
 * WO-O4O-GLYCOPHARM-STORE-HUB-ADOPTION-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 auto-refresh
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1 (census F1):
 *   `/store-hub/*` endpoint 계약을 `@o4o/store-ui-core` 의 `createStoreHubApi` 로 이관.
 *   이 파일은 **`/glycopharm` prefix + axios `.data` 언랩 + 기존 함수명 유지**만 소유한다.
 *   경로·응답·호출부 무변경.
 */

import { createStoreHubApi } from '@o4o/store-ui-core';
import { api } from '@/lib/apiClient';

export type {
  StoreHubOverview,
  ChannelType,
  ChannelStatus,
  ChannelOverview,
  ChannelOverviewWithCode,
  StoreKpiSummary,
  LiveSignals,
  StoreCapabilityOverview,
} from '@o4o/store-ui-core';

const axiosApi = api as unknown as {
  get: <T>(url: string) => Promise<{ data: T }>;
  post: <T>(url: string, body?: unknown) => Promise<{ data: T }>;
  patch: <T>(url: string, body?: unknown) => Promise<{ data: T }>;
};

const ns = (url: string) => `/glycopharm${url}`;

const storeHubApi = createStoreHubApi({
  get: <T,>(url: string) => axiosApi.get<T>(ns(url)).then((r) => r.data),
  post: <T,>(url: string, body?: unknown) => axiosApi.post<T>(ns(url), body).then((r) => r.data),
  patch: <T,>(url: string, body?: unknown) => axiosApi.patch<T>(ns(url), body).then((r) => r.data),
});

export const fetchStoreHubOverview = storeHubApi.fetchOverview;
export const fetchChannelOverview = storeHubApi.fetchChannels;
export const fetchChannelOverviewWithCode = storeHubApi.fetchChannelsWithCode;
export const createChannel = storeHubApi.createChannel;
export const fetchStoreKpiSummary = storeHubApi.fetchKpiSummary;
export const fetchLiveSignals = storeHubApi.fetchLiveSignals;
export const fetchStoreCapabilities = storeHubApi.fetchCapabilities;

/** 기존 계약 유지 — slug 문자열만 반환. */
export async function getStoreSlug(): Promise<string | null> {
  const status = await storeHubApi.fetchSlugStatus();
  return status.slug ?? null;
}
