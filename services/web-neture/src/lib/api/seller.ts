/**
 * Seller API
 */
import { API_BASE_URL, fetchWithTimeout } from './client.js';
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
      const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return response.json();
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
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/neture/seller/my-products`, {
        credentials: 'include',
      });
      return response.json();
    } catch (error) {
      return { success: false, error: 'NETWORK_ERROR' };
    }
  },

  async getAvailableSupplyProducts(): Promise<OperatorSupplyProduct[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/seller/available-supply-products`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Seller API] Failed to fetch available supply products:', error);
      return [];
    }
  },
};
