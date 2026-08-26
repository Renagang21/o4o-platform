/**
 * Seller API
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 */
import { api } from '../apiClient';
import type { OperatorSupplyProduct } from './operator.js';

export interface SellerApprovedProduct {
  id: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  productCategory: string;
  productPurpose: string;
  serviceId: string;
  serviceName: string;
  approvedAt: string;
}

export const sellerApi = {
  // WO-O4O-CROSSSERVICE-B2B-SUPPLIER-TO-STORE-ORDER-CANONICAL-CONTRACT-V1 (결함 D4):
  //   `createHandlingRequest` 를 제거했다. 대상 `POST /neture/supplier/requests` 는
  //   WO-NETURE-SUPPLIER-OFFERS-DEAD-CODE-REMOVAL-V1(2026-04-25)에서 삭제된 라우트이고
  //   호출부도 0 이었다. 재추가 금지.

  async getMyApprovedProducts(): Promise<{
    success: boolean;
    data?: SellerApprovedProduct[];
    error?: string;
  }> {
    try {
      const response = await api.get('/neture/seller/my-products');
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async getAvailableSupplyProducts(): Promise<OperatorSupplyProduct[]> {
    try {
      const response = await api.get('/neture/seller/available-supply-products');
      const result = response.data;
      return result.data || [];
    } catch (error) {
      console.warn('[Seller API] Failed to fetch available supply products:', error);
      throw error;
    }
  },
};
