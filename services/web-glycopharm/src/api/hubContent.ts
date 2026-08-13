/**
 * Hub Content API Client — GlycoPharm
 *
 * WO-O4O-GLYCOPHARM-HUB-CONTENT-API-WRAPPER-V1
 * WO-O4O-STORE-HUB-API-CLIENT-AND-SERVICE-SCOPE-ALIGNMENT-V1:
 *   query 조립을 `@o4o/store-ui-core` 의 `createHubContentApi` 로 이관.
 *   이 파일은 **전송(axios `.data` 언랩) · serviceKey · 타입 재노출**만 소유한다.
 *   (K-Cosmetics·Neture 사본과 주석·import 경로·SERVICE_KEY 외 차이가 없었다 — SAME_CONTRACT)
 *   전송 URL · query · 응답 형상 무변경. GlycoPharm 정식 공통 소비자(WO §6).
 *
 * GET /api/v1/hub/contents?serviceKey=glycopharm&sourceDomain=...
 */

import { createHubContentApi } from '@o4o/store-ui-core';
import { api } from '@/lib/apiClient';
import type { HubContentListResponse, HubContentItemResponse } from '@o4o/types/hub-content';

export type { HubContentItemResponse };

// 응답 타입은 `@o4o/types` 소유다. store-ui-core 는 이 패키지에 의존하지 않으므로
// 제네릭으로 주입해 타입 계약을 원 소유처에 그대로 남긴다.
const axiosApi = api as unknown as { get: <T>(url: string) => Promise<{ data: T }> };

export const hubContentApi = createHubContentApi<HubContentListResponse>(
  { get: <T,>(url: string) => axiosApi.get<T>(url).then((r) => r.data) },
  { serviceKey: 'glycopharm' },
);
