/**
 * Supplier CSV Import API
 *
 * WO-NETURE-CSV-IMPORT-UI-V1
 */
import { api } from './client.js';

export interface CsvBatch {
  id: string;
  supplierId: string;
  status: string;
  totalRows: number;
  validRows: number;
  rejectedRows: number;
  appliedRows: number;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CsvBatchRow {
  id: string;
  rowNumber: number;
  parsedBarcode: string | null;
  parsedSupplyPrice: number | null;
  parsedDistributionType: string | null;
  validationStatus: string;
  validationError: string | null;
  actionType: string | null;
  masterId: string | null;
  rawJson: Record<string, unknown>;
}

export interface CsvBatchDetail extends CsvBatch {
  rows: CsvBatchRow[];
}

export interface CsvApplyResult {
  appliedOffers: number;
  createdMasters: number;
  linkedExisting: number;
  rejected: number;
}

export const csvImportApi = {
  async uploadCsv(file: File): Promise<{ success: boolean; error?: string; data?: CsvBatch }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/neture/supplier/csv-import/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || error?.response?.data?.error?.code || 'NETWORK_ERROR';
      return { success: false, error: msg };
    }
  },

  async getBatches(): Promise<CsvBatch[]> {
    try {
      const response = await api.get('/neture/supplier/csv-import/batches');
      const result = response.data;
      return result.data || [];
    } catch (error) {
      console.warn('[CSV Import API] Failed to fetch batches:', error);
      return [];
    }
  },

  async getBatchDetail(batchId: string): Promise<{ success: boolean; error?: string; data?: CsvBatchDetail }> {
    try {
      const response = await api.get(`/neture/supplier/csv-import/batches/${batchId}`);
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || 'NETWORK_ERROR';
      return { success: false, error: msg };
    }
  },

  async applyBatch(batchId: string): Promise<{ success: boolean; error?: string; data?: CsvApplyResult }> {
    try {
      const response = await api.post(`/neture/supplier/csv-import/batches/${batchId}/apply`);
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || error?.response?.data?.error?.code || 'NETWORK_ERROR';
      return { success: false, error: msg };
    }
  },
};
