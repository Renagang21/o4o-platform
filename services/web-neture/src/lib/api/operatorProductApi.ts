/**
 * Operator Product Approval API
 *
 * WO-O4O-NETURE-OPERATOR-PRODUCT-API-SCOPE-FIX-V1
 *
 * neture:operator 스코프로 접근 가능한 상품 승인 API.
 * adminProductApi 대신 이 API를 operator 페이지에서 사용한다.
 */

import { api } from '../apiClient';
import type { AdminProduct } from './admin';

export const operatorProductApi = {
  async getProducts(status?: string): Promise<AdminProduct[]> {
    try {
      const qs = status ? `?status=${status}` : '';
      const response = await api.get(`/neture/operator/products${qs}`);
      return response.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Operator Product API] Failed to fetch products:', error);
      return [];
    }
  },

  async approveProduct(id: string): Promise<boolean> {
    try {
      await api.post(`/neture/operator/products/${id}/approve`);
      return true;
    } catch { return false; }
  },

  async rejectProduct(id: string, reason?: string): Promise<boolean> {
    try {
      await api.post(`/neture/operator/products/${id}/reject`, { reason });
      return true;
    } catch { return false; }
  },

  async batchApprove(ids: string[]) {
    const res = await api.post('/neture/operator/products/batch-approve', { ids });
    return res.data;
  },

  async batchReject(ids: string[], reason?: string) {
    const res = await api.post('/neture/operator/products/batch-reject', { ids, reason });
    return res.data;
  },
};
