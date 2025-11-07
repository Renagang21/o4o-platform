import { apiClient } from './api';

/**
 * Settlement API Types
 */
export interface Settlement {
  id: string;
  paymentId: string;
  recipientType: 'partner' | 'supplier' | 'platform';
  recipientId: string;
  recipientName: string;
  amount: number;
  currency: string;
  fee: number;
  tax: number;
  netAmount: number;
  status: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  scheduledAt: string;
  processedAt?: string;
  completedAt?: string;
  bankAccount?: {
    bankCode: string;
    bankName: string;
    accountNumber: string;
    holderName: string;
  };
  transactionId?: string;
  transactionProof?: string;
  receiptUrl?: string;
  failureReason?: string;
  retryCount: number;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  payment?: any; // Payment relation
}

export interface SettlementListParams {
  status?: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  recipientType?: 'partner' | 'supplier' | 'platform';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface SettlementListResponse {
  success: boolean;
  data: Settlement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SettlementSummary {
  totalEarnings: number;
  pendingAmount: number;
  processingAmount: number;
  failedAmount: number;
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  processingCount: number;
  currency: string;
  nextScheduledSettlement: {
    id: string;
    amount: number;
    scheduledAt: string;
  } | null;
}

export interface SettlementSummaryResponse {
  success: boolean;
  data: SettlementSummary;
}

export interface SettlementDetailResponse {
  success: boolean;
  data: Settlement;
}

/**
 * Settlement API Service
 * Connects to /api/v1/entity/settlements endpoints
 */
export const settlementAPI = {
  /**
   * GET /api/v1/entity/settlements
   * List settlements with filtering and pagination
   */
  list: (params?: SettlementListParams): Promise<SettlementListResponse> => {
    return apiClient.get('/api/v1/entity/settlements', { params }).then(res => res.data);
  },

  /**
   * GET /api/v1/entity/settlements/:id
   * Get settlement details by ID
   */
  get: (id: string): Promise<SettlementDetailResponse> => {
    return apiClient.get(`/api/v1/entity/settlements/${id}`).then(res => res.data);
  },

  /**
   * GET /api/v1/entity/settlements/summary
   * Get settlement summary statistics for dashboard
   */
  summary: (): Promise<SettlementSummaryResponse> => {
    return apiClient.get('/api/v1/entity/settlements/summary').then(res => res.data);
  },
};

export default settlementAPI;
