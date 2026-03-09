/**
 * Operator Supply API + Operator Copilot API
 *
 * WO-O4O-OPERATOR-COPILOT-DASHBOARD-V1
 */
import { API_BASE_URL, fetchWithTimeout } from './client.js';
import type { DistributionType } from './supplier.js';

// ==================== Operator Copilot Types ====================

export interface OperatorKpiSummary {
  totalStores: number;
  totalSuppliers: number;
  totalProducts: number;
  recentOrders: number;
}

export interface RecentStoreItem {
  id: string;
  name: string;
  createdAt: string;
}

export interface SupplierActivityItem {
  supplierName: string;
  productName: string;
  createdAt: string;
}

export interface PendingProductItem {
  productId: string;
  productName: string;
  supplierName: string;
  createdAt: string;
}

export interface PlatformTrends {
  currentOrders: number;
  previousOrders: number;
  orderGrowth: number;
  newStores: number;
  newSuppliers: number;
}

export interface AlertItem {
  id: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  link?: string;
}

export interface OperatorAiSummary {
  insight: {
    summary: string;
    riskLevel: string;
    recommendedActions: string[];
    confidenceScore: number;
  };
  meta: {
    provider: string;
    model: string;
    durationMs: number;
  };
}

// ==================== Operator Copilot API ====================

export const operatorCopilotApi = {
  async getKpi(): Promise<OperatorKpiSummary> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/operator/copilot/kpi`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      return result.data || { totalStores: 0, totalSuppliers: 0, totalProducts: 0, recentOrders: 0 };
    } catch (error) {
      console.warn('[Operator Copilot] KPI fetch failed:', error);
      throw error;
    }
  },

  async getRecentStores(): Promise<RecentStoreItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/operator/copilot/stores`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Operator Copilot] Stores fetch failed:', error);
      return [];
    }
  },

  async getSupplierActivity(): Promise<SupplierActivityItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/operator/copilot/suppliers`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Operator Copilot] Suppliers fetch failed:', error);
      return [];
    }
  },

  async getPendingProducts(): Promise<PendingProductItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/operator/copilot/products`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Operator Copilot] Products fetch failed:', error);
      return [];
    }
  },

  async getTrends(): Promise<PlatformTrends> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/operator/copilot/trends`, {
        credentials: 'include',
      });
      if (!response.ok) return { currentOrders: 0, previousOrders: 0, orderGrowth: 0, newStores: 0, newSuppliers: 0 };
      const result = await response.json();
      return result.data || { currentOrders: 0, previousOrders: 0, orderGrowth: 0, newStores: 0, newSuppliers: 0 };
    } catch (error) {
      console.warn('[Operator Copilot] Trends fetch failed:', error);
      return { currentOrders: 0, previousOrders: 0, orderGrowth: 0, newStores: 0, newSuppliers: 0 };
    }
  },

  async getAlerts(): Promise<AlertItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/operator/copilot/alerts`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Operator Copilot] Alerts fetch failed:', error);
      return [];
    }
  },

  async getAiSummary(): Promise<OperatorAiSummary | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/operator/copilot/ai-summary`, {
        credentials: 'include',
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.warn('[Operator Copilot] AI summary fetch failed:', error);
      return null;
    }
  },
};

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
