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
  offerId: string | null; // WO-O4O-NETURE-IMPORT-PRODUCT-TRACE-V1
  rawJson: Record<string, unknown>;
  // WO-O4O-NETURE-CSV-PARTIAL-SUCCESS-V1
  applyStatus: string | null;
  applyError: string | null;
}

export interface CsvBatchDetail extends CsvBatch {
  rows: CsvBatchRow[];
}

export interface CsvApplyResult {
  appliedOffers: number;
  createdMasters: number;
  linkedExisting: number;
  rejected: number;
  // WO-O4O-NETURE-CSV-PARTIAL-SUCCESS-V1
  failedRows: number;
  errors?: Array<{ rowNumber: number; barcode: string | null; error: string }>;
}

// WO-O4O-NETURE-IMPORT-RETRY-FAILED-V1
export interface CsvRetryResult {
  retriedRows: number;
  appliedOffers: number;
  createdMasters: number;
  failedRows: number;
  errors?: Array<{ rowNumber: number; barcode: string | null; error: string }>;
}

// WO-O4O-NETURE-CSV-XLSX-UPLOAD-NETWORK-ERROR-FIX-V1
// 에러 추출: 백엔드 nested { error: { message, code } } + multer flat { error: "string" } 모두 처리
function extractErrorMessage(error: any): string {
  // 1. 서버 응답이 있는 경우
  const data = error?.response?.data;
  if (data) {
    // nested: { error: { message, code } }
    if (typeof data.error === 'object' && data.error !== null) {
      return data.error.message || data.error.code || 'UNKNOWN_ERROR';
    }
    // flat (multer 등): { error: "string" }
    if (typeof data.error === 'string') {
      return data.error;
    }
    // fallback: { message: "string" }
    if (typeof data.message === 'string') {
      return data.message;
    }
  }
  // 2. 타임아웃
  if (error?.code === 'ECONNABORTED') {
    return '업로드 시간이 초과되었습니다. 파일 크기를 확인해주세요.';
  }
  // 3. 서버 응답 없음 (진짜 네트워크 오류)
  return 'NETWORK_ERROR';
}

export const csvImportApi = {
  /** XLSX 템플릿 다운로드 (WO-NETURE-BULK-IMPORT-TEMPLATE-UPGRADE-V1) */
  async downloadTemplate(): Promise<void> {
    const response = await api.get('/neture/supplier/products/template', {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neture_product_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  },

  async uploadCsv(file: File): Promise<{ success: boolean; error?: string; data?: CsvBatch }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/neture/supplier/csv-import/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000, // 2분 — 대용량 파일 + 행별 검증 시간 확보
      });
      return response.data;
    } catch (error: any) {
      return { success: false, error: extractErrorMessage(error) };
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
      return { success: false, error: extractErrorMessage(error) };
    }
  },

  async applyBatch(batchId: string): Promise<{ success: boolean; error?: string; data?: CsvApplyResult }> {
    try {
      const response = await api.post(`/neture/supplier/csv-import/batches/${batchId}/apply`, undefined, {
        timeout: 180_000, // 3분 — apply는 Master 생성 + 이미지 처리 포함
      });
      return response.data;
    } catch (error: any) {
      return { success: false, error: extractErrorMessage(error) };
    }
  },

  // WO-O4O-NETURE-IMPORT-RETRY-FAILED-V1
  async retryBatch(batchId: string, rows?: number[]): Promise<{ success: boolean; error?: string; data?: CsvRetryResult }> {
    try {
      const body = rows && rows.length > 0 ? { rows } : undefined;
      const response = await api.post(`/neture/supplier/csv-import/batches/${batchId}/retry`, body, {
        timeout: 180_000,
      });
      return response.data;
    } catch (error: any) {
      return { success: false, error: extractErrorMessage(error) };
    }
  },

  // WO-O4O-NETURE-IMPORT-HISTORY-DELETE-V1
  async deleteBatch(batchId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete(`/neture/supplier/csv-import/batches/${batchId}`);
      return response.data;
    } catch (error: any) {
      return { success: false, error: extractErrorMessage(error) };
    }
  },
};
