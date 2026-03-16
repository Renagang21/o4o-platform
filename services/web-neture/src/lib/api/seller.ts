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
  async createHandlingRequest(data: {
    supplierId: string;
    productId: string;
    productName: string;
    productCategory?: string;
    productPurpose?: string;
    serviceId: string;
    serviceName: string;
  }): Promise<{ success: boolean; error?: string; data?: { id: string; status: string; createdAt: string } }> {
    try {
      const response = await api.post('/neture/supplier/requests', data);
      return response.data;
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

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
      return [];
    }
  },
};
