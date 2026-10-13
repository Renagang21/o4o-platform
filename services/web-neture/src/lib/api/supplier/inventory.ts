import { api } from '../../apiClient';
import type { InventoryItem } from '../store.js';
import { SUPPLIER_INVENTORY_LOAD_FAILED, extractApiError } from './errors';

export const supplierInventoryApi = {
  // Inventory
  async getInventory(): Promise<InventoryItem[]> {
    let response;
    try {
      response = await api.get('/neture/supplier/inventory');
    } catch (error) {
      console.warn('[Supplier API] Failed to fetch inventory:', extractApiError(error));
      throw new Error(SUPPLIER_INVENTORY_LOAD_FAILED);
    }
    const result = response.data;
    if (!Array.isArray(result?.data)) {
      console.warn('[Supplier API] Unexpected inventory payload shape');
      throw new Error(SUPPLIER_INVENTORY_LOAD_FAILED);
    }
    return result.data as InventoryItem[];
  },

  async updateInventory(
    offerId: string,
    updates: {
      stock_quantity?: number;
      low_stock_threshold?: number;
      track_inventory?: boolean;
      expected_version?: string;
    },
  ): Promise<{ success: boolean; error?: string; data?: InventoryItem }> {
    try {
      const response = await api.patch(`/neture/supplier/inventory/${offerId}`, updates);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },
};
