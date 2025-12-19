/**
 * ERP Connector API Client
 *
 * Phase 0: Mock implementation for frontend development
 * Ecount ERP 연동 상태 조회 및 전송 내역 조회
 */

import { authClient } from '@o4o/auth-client';

// ERP 연결 상태
export interface ErpConnectionStatus {
  connected: boolean;
  erpType: 'ecount' | 'none';
  companyCode?: string;
  lastSyncAt?: string;
  lastSyncResult?: 'success' | 'failure';
  lastErrorMessage?: string;
}

// ERP 전송 내역
export interface ErpTransmission {
  id: string;
  eventType: 'SETTLEMENT_CLOSED' | 'ORDER_COMPLETED' | 'REFUND_PROCESSED';
  voucherType: 'PURCHASE' | 'PAYMENT' | 'SALES' | 'RECEIPT';
  settlementBatchId?: string;
  batchNumber?: string;
  supplierCode?: string;
  supplierName?: string;
  amount: number;
  status: 'SUCCESS' | 'FAILURE' | 'PENDING';
  voucherNo?: string;
  errorMessage?: string;
  createdAt: string;
  processedAt?: string;
}

export interface ErpTransmissionListResponse {
  success: boolean;
  data: ErpTransmission[];
  total: number;
  page: number;
  limit: number;
}

// Mock data for Phase 0 development
const MOCK_CONNECTION_STATUS: ErpConnectionStatus = {
  connected: false,
  erpType: 'none',
};

const MOCK_CONNECTED_STATUS: ErpConnectionStatus = {
  connected: true,
  erpType: 'ecount',
  companyCode: 'SAMPLE_CO',
  lastSyncAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30분 전
  lastSyncResult: 'success',
};

const MOCK_TRANSMISSIONS: ErpTransmission[] = [
  {
    id: 'tx-001',
    eventType: 'SETTLEMENT_CLOSED',
    voucherType: 'PURCHASE',
    settlementBatchId: 'batch-2024-001',
    batchNumber: 'STL-2024-001',
    supplierCode: 'SUP001',
    supplierName: '화장품공급사A',
    amount: 1250000,
    status: 'SUCCESS',
    voucherNo: 'PU-20241219-001',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    processedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5000).toISOString(),
  },
  {
    id: 'tx-002',
    eventType: 'SETTLEMENT_CLOSED',
    voucherType: 'PAYMENT',
    settlementBatchId: 'batch-2024-001',
    batchNumber: 'STL-2024-001',
    supplierCode: 'SUP001',
    supplierName: '화장품공급사A',
    amount: 1250000,
    status: 'SUCCESS',
    voucherNo: 'PAY-20241219-001',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5000).toISOString(),
    processedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 10000).toISOString(),
  },
  {
    id: 'tx-003',
    eventType: 'SETTLEMENT_CLOSED',
    voucherType: 'PURCHASE',
    settlementBatchId: 'batch-2024-002',
    batchNumber: 'STL-2024-002',
    supplierCode: 'SUP002',
    supplierName: '화장품공급사B',
    amount: 890000,
    status: 'FAILURE',
    errorMessage: 'Ecount API 응답 오류: Invalid session',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tx-004',
    eventType: 'SETTLEMENT_CLOSED',
    voucherType: 'PURCHASE',
    settlementBatchId: 'batch-2024-003',
    batchNumber: 'STL-2024-003',
    supplierCode: 'SUP001',
    supplierName: '화장품공급사A',
    amount: 2340000,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

// API 호출 여부 제어 (환경변수 또는 로컬스토리지로 토글)
const USE_MOCK = true; // Phase 0에서는 항상 Mock 사용

export const erpConnectorAPI = {
  /**
   * ERP 연결 상태 조회
   */
  getConnectionStatus: async (): Promise<{ success: boolean; data: ErpConnectionStatus }> => {
    if (USE_MOCK) {
      // localStorage에서 연결 상태 시뮬레이션
      const mockConnected = localStorage.getItem('erp_mock_connected') === 'true';
      return {
        success: true,
        data: mockConnected ? MOCK_CONNECTED_STATUS : MOCK_CONNECTION_STATUS,
      };
    }

    try {
      const response = await authClient.api.get('/admin/erp/connection-status');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, data: MOCK_CONNECTION_STATUS };
    }
  },

  /**
   * ERP 전송 내역 조회
   */
  getTransmissions: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    eventType?: string;
  }): Promise<ErpTransmissionListResponse> => {
    if (USE_MOCK) {
      let filtered = [...MOCK_TRANSMISSIONS];

      if (params?.status) {
        filtered = filtered.filter((t) => t.status === params.status);
      }
      if (params?.eventType) {
        filtered = filtered.filter((t) => t.eventType === params.eventType);
      }

      return {
        success: true,
        data: filtered,
        total: filtered.length,
        page: params?.page || 1,
        limit: params?.limit || 20,
      };
    }

    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', String(params.page));
      if (params?.limit) queryParams.append('limit', String(params.limit));
      if (params?.status) queryParams.append('status', params.status);
      if (params?.eventType) queryParams.append('eventType', params.eventType);

      const queryString = queryParams.toString();
      const response = await authClient.api.get(
        `/admin/erp/transmissions${queryString ? `?${queryString}` : ''}`
      );
      return response.data;
    } catch (error) {
      return { success: false, data: [], total: 0, page: 1, limit: 20 };
    }
  },

  /**
   * 전송 재시도
   */
  retryTransmission: async (
    transmissionId: string
  ): Promise<{ success: boolean; message: string }> => {
    if (USE_MOCK) {
      return { success: true, message: '재시도 요청이 접수되었습니다.' };
    }

    try {
      const response = await authClient.api.post(`/admin/erp/transmissions/${transmissionId}/retry`);
      return response.data;
    } catch (error) {
      return { success: false, message: '재시도 요청 실패' };
    }
  },

  /**
   * Mock 연결 상태 토글 (개발용)
   */
  toggleMockConnection: (): boolean => {
    const current = localStorage.getItem('erp_mock_connected') === 'true';
    localStorage.setItem('erp_mock_connected', String(!current));
    return !current;
  },
};
