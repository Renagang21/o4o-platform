/**
 * Offer API
 *
 * authClient.api 래퍼
 *
 * Phase 10: Web Extension Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 Generator 입력 정의를 수정하고 재생성하세요.
 */

import { authClient } from '@o4o/auth-client';
import type {
  OfferListResponse,
  OfferDetailResponse,
} from './types';

const api = authClient.api;
const BASE_PATH = '/api/v1/dropshipping/offers';

export const offerApi = {
  /**
   * 목록 조회
   */
  list: async (params?: URLSearchParams): Promise<OfferListResponse> => {
    const query = params ? `?${params.toString()}` : '';
    const response = await api.get<OfferListResponse>(`${BASE_PATH}${query}`);
    return response.data;
  },

  /**
   * 상세 조회
   */
  get: async (id: string): Promise<OfferDetailResponse> => {
    const response = await api.get<OfferDetailResponse>(`${BASE_PATH}/${id}`);
    return response.data;
  },
};

export default offerApi;
