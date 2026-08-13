/**
 * GlycoPharm Event Offer API (Store-side)
 *
 * WO-O4O-GLYCOPHARM-EVENT-OFFERS-HUB-CANONICAL-ALIGNMENT-V1
 * WO-O4O-STORE-HUB-API-CLIENT-AND-SERVICE-SCOPE-ALIGNMENT-V1:
 *   endpoint · 타입 계약을 `@o4o/store-ui-core` 의 `createEventOfferApi` 로 이관.
 *   이 파일은 **전송(axios) · `/glycopharm` basePath · export 이름**만 소유한다.
 *   (K-Cosmetics 사본과 주석·export명·prefix 외 차이가 없었다 — SAME_CONTRACT_DIFFERENT_PREFIX)
 *   전송 URL · query · body · 응답 형상 무변경. GlycoPharm 정식 공통 소비자(WO §6).
 *
 * Backend endpoints:
 * - GET  /api/v1/glycopharm/event-offers/enriched
 * - POST /api/v1/glycopharm/event-offers/:id/participate  (WO-O4O-EVENT-OFFER-GLYCO-KCOS-STORE-ORDER-ENABLE-V1)
 */

import { createEventOfferApi } from '@o4o/store-ui-core';
import { api } from '../lib/apiClient';

export type {
  EnrichedEventOffer,
  EnrichedEventOffersResponse,
  EventOfferOrderResult,
  EventOfferOrderResponse,
} from '@o4o/store-ui-core';

// authClient.api(Axios) 를 응답 래퍼가 명확한 shape 으로 한정.
// 공통 `EventOffersHubList` 가 `res.data?.data` 로 읽으므로 래퍼를 언랩하지 않는다.
const axiosApi = api as unknown as {
  get: <T>(url: string) => Promise<{ data: T }>;
  post: <T>(url: string, body?: unknown) => Promise<{ data: T }>;
};

export const glycopharmEventOfferApi = createEventOfferApi(axiosApi, {
  basePath: '/glycopharm/event-offers',
});
