/**
 * Operator Supply API
 *
 * WO-O4O-OPERATOR-DASHBOARD-DATA-NORMALIZATION-V1:
 *   operatorCopilotApi removed (no consumers after dashboard normalization).
 *   Copilot API deferred to WO-O4O-COPILOT-ENGINE-INTEGRATION-V1.
 */
import { API_BASE_URL, fetchWithTimeout } from './client.js';
import type { DistributionType } from './supplier.js';

export interface OperatorSupplyProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  distributionType?: DistributionType;
  supplierId: string;
  supplierName: string;
  supplyStatus: 'available' | 'pending' | 'approved' | 'rejected';
  requestId: string | null;
  rejectReason: string | null;
  priceGeneral: number;
  consumerReferencePrice: number | null;
  approvalStatus: string;
  barcode: string;
  specification: string | null;
  primaryImageUrl: string | null;
}

export const operatorSupplyApi = {
  async getSupplyProducts(): Promise<OperatorSupplyProduct[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/operator/supply-products`,
        { credentials: 'include' },
      );
      if (!response.ok) {
        console.warn('[Operator API] Supply products not available');
        return [];
      }
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Operator API] Failed to fetch supply products:', error);
      return [];
    }
  },

  async createSupplyRequest(data: {
    supplierId: string;
    productId: string;
    productName: string;
    serviceId: string;
    serviceName: string;
  }): Promise<{ success: boolean; error?: string; existingStatus?: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/neture/supplier/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.status === 409) {
      return { success: false, error: 'DUPLICATE_REQUEST', existingStatus: result.existingStatus };
    }

    if (!response.ok) {
      return { success: false, error: result.error || 'UNKNOWN_ERROR' };
    }

    return { success: true };
  },
};
