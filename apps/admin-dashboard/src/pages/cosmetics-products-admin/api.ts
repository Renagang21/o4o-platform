/**
 * Product Admin API
 *
 * authClient.api 래퍼 (Admin 전용)
 * Phase 11: Web Admin Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 */

import { authClient } from '@o4o/auth-client';
import type {
  CreateProductRequest,
  UpdateProductRequest,
  UpdateStatusRequest,
  StatusChangeResponse,
} from './types';

const api = authClient.api;
const BASE_PATH = '/api/v1/cosmetics/products';
const ADMIN_PATH = '/api/v1/cosmetics/admin/products';

export const productAdminApi = {
  /**
   * 생성 (Admin)
   */
  create: async (data: CreateProductRequest) => {
    const response = await api.post(ADMIN_PATH, data);
    return response.data;
  },

  /**
   * 수정 (Admin)
   */
  update: async (id: string, data: UpdateProductRequest) => {
    const response = await api.put(`${ADMIN_PATH}/${id}`, data);
    return response.data;
  },

  /**
   * 상태 변경 (Admin)
   */
  updateStatus: async (id: string, data: UpdateStatusRequest): Promise<StatusChangeResponse> => {
    const response = await api.patch<StatusChangeResponse>(`${ADMIN_PATH}/${id}/status`, data);
    return response.data;
  },
};

export default productAdminApi;
