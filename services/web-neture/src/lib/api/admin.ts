/**
 * Admin APIs - Operator, Supplier, Product, Master, Service Approval, Registration, Settlement
 */
import { API_BASE_URL, fetchWithTimeout } from './client.js';
import type {
  SettlementStatus,
  SettlementsResponse,
  SettlementDetail,
  AdminSettlementKpi,
} from './store.js';
import type {
  CommissionStatus,
  CommissionsResponse,
  CommissionDetail,
} from './partner.js';

// ==================== Admin Operator ====================

export interface NetureOperatorInfo {
  id: string;
  name: string;
  email: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
}

export const adminOperatorApi = {
  async getOperators(includeInactive = false): Promise<NetureOperatorInfo[]> {
    try {
      const qs = includeInactive ? '?includeInactive=true' : '';
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/operators${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) {
        console.warn('[Admin API] Operators API not available');
        return [];
      }
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] Failed to fetch operators:', error);
      return [];
    }
  },

  async deactivateOperator(userId: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/operators/${userId}/deactivate`,
        { method: 'PATCH', credentials: 'include' },
      );
      return response.ok;
    } catch {
      return false;
    }
  },

  async reactivateOperator(userId: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/operators/${userId}/reactivate`,
        { method: 'PATCH', credentials: 'include' },
      );
      return response.ok;
    } catch {
      return false;
    }
  },
};

// ==================== Admin Supplier ====================

export interface AdminSupplier {
  id: string;
  name: string;
  representativeName: string;
  status: string;
  email: string;
  createdAt: string;
}

export const adminSupplierApi = {
  async getSuppliers(status?: string): Promise<AdminSupplier[]> {
    try {
      const qs = status ? `?status=${status}` : '';
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/suppliers${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] Failed to fetch suppliers:', error);
      return [];
    }
  },

  async getPendingSuppliers(): Promise<AdminSupplier[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/suppliers/pending`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] Failed to fetch pending suppliers:', error);
      return [];
    }
  },

  async approveSupplier(id: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/suppliers/${id}/approve`,
        { method: 'POST', credentials: 'include' },
      );
      return response.ok;
    } catch { return false; }
  },

  async rejectSupplier(id: string, reason?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/suppliers/${id}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason }),
        },
      );
      return response.ok;
    } catch { return false; }
  },

  async deactivateSupplier(id: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/suppliers/${id}/deactivate`,
        { method: 'POST', credentials: 'include' },
      );
      return response.ok;
    } catch { return false; }
  },
};

// ==================== Admin Settlement ====================

const ADMIN_SETTLEMENT_KPI_DEFAULT: AdminSettlementKpi = {
  calculated_count: 0, calculated_amount: 0,
  approved_count: 0, approved_amount: 0,
  paid_count: 0, paid_amount: 0,
};

export const adminSettlementApi = {
  async getSettlements(
    params?: { page?: number; limit?: number; status?: SettlementStatus }
  ): Promise<SettlementsResponse> {
    try {
      const sp = new URLSearchParams();
      if (params?.page) sp.append('page', String(params.page));
      if (params?.limit) sp.append('limit', String(params.limit));
      if (params?.status) sp.append('status', params.status);
      const qs = sp.toString() ? `?${sp}` : '';

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/settlements${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      const result = await response.json();
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch (error) {
      console.warn('[Admin Settlement API] Failed to fetch settlements:', error);
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  async getKpi(): Promise<AdminSettlementKpi> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/settlements/kpi`,
        { credentials: 'include' },
      );
      if (!response.ok) return ADMIN_SETTLEMENT_KPI_DEFAULT;
      const result = await response.json();
      return result.data || ADMIN_SETTLEMENT_KPI_DEFAULT;
    } catch {
      return ADMIN_SETTLEMENT_KPI_DEFAULT;
    }
  },

  async getDetail(id: string): Promise<SettlementDetail | null> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/settlements/${id}`,
        { credentials: 'include' },
      );
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch { return null; }
  },

  async calculate(periodStart: string, periodEnd: string): Promise<{ success: boolean; data?: any; error?: string; message?: string }> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/settlements/calculate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
        },
      );
      return await response.json();
    } catch { return { success: false, error: 'NETWORK_ERROR' }; }
  },

  async approve(id: string, notes?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/settlements/${id}/approve`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ notes }),
        },
      );
      return response.ok;
    } catch { return false; }
  },

  async pay(id: string, notes?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/settlements/${id}/pay`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ notes }),
        },
      );
      return response.ok;
    } catch { return false; }
  },

  async cancel(id: string, notes?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/settlements/${id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'cancelled', notes }),
        },
      );
      return response.ok;
    } catch { return false; }
  },
};

// ==================== Admin Product ====================

export interface AdminProduct {
  id: string;
  masterId: string;
  marketingName: string;
  supplierName: string;
  category: string;
  distributionType: string;
  approvalStatus: string;
  isActive: boolean;
  createdAt: string;
}

export const adminProductApi = {
  async getProducts(status?: string): Promise<AdminProduct[]> {
    try {
      const qs = status ? `?status=${status}` : '';
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/products${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] Failed to fetch products:', error);
      return [];
    }
  },

  async getPendingProducts(): Promise<AdminProduct[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/products/pending`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] Failed to fetch pending products:', error);
      return [];
    }
  },

  async approveProduct(id: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/products/${id}/approve`,
        { method: 'POST', credentials: 'include' },
      );
      return response.ok;
    } catch { return false; }
  },

  async rejectProduct(id: string, reason?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/products/${id}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason }),
        },
      );
      return response.ok;
    } catch { return false; }
  },
};

// ==================== Admin Master ====================

export interface AdminMaster {
  id: string;
  barcode: string;
  regulatoryType: string;
  regulatoryName: string;
  marketingName: string;
  brandName: string | null;
  manufacturerName: string;
  mfdsPermitNumber: string | null;
  isMfdsVerified: boolean;
  categoryId: string | null;
  brandId: string | null;
  specification: string | null;
  originCountry: string | null;
  tags: string[];
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  createdAt: string;
}

export const adminMasterApi = {
  async getMasters(): Promise<AdminMaster[]> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/masters`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] Failed to fetch masters:', error);
      return [];
    }
  },

  async getMasterByBarcode(barcode: string): Promise<AdminMaster | null> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/masters/barcode/${encodeURIComponent(barcode)}`,
        { credentials: 'include' },
      );
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.warn('[Admin API] Failed to fetch master by barcode:', error);
      return null;
    }
  },

  async resolveMaster(data: { barcode: string; manualData?: Record<string, unknown> }): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/masters/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        },
      );
      return response.ok;
    } catch { return false; }
  },

  async updateMaster(id: string, data: Partial<AdminMaster>): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/masters/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        },
      );
      return response.ok;
    } catch { return false; }
  },
};

// ==================== Admin Service Approval ====================

export interface ServiceApproval {
  id: string;
  productName: string;
  supplierName: string;
  sellerOrg: string;
  serviceId: string;
  status: string;
  requestedAt: string;
  decidedAt?: string;
  rejectReason?: string;
}

export const adminServiceApprovalApi = {
  async getServiceApprovals(status?: string): Promise<ServiceApproval[]> {
    try {
      const qs = status ? `?status=${status}` : '';
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/service-approvals${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] Failed to fetch service approvals:', error);
      return [];
    }
  },

  async approveServiceApproval(id: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/service-approvals/${id}/approve`,
        { method: 'POST', credentials: 'include' },
      );
      return response.ok;
    } catch { return false; }
  },

  async rejectServiceApproval(id: string, reason?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/service-approvals/${id}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason }),
        },
      );
      return response.ok;
    } catch { return false; }
  },

  async revokeServiceApproval(id: string, reason?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/service-approvals/${id}/revoke`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason }),
        },
      );
      return response.ok;
    } catch { return false; }
  },
};

// ==================== Admin Commission (WO-O4O-PARTNER-COMMISSION-ENGINE-V1) ====================

export interface AdminCommissionKpi {
  pending_count: number;
  pending_amount: number;
  approved_count: number;
  approved_amount: number;
  paid_count: number;
  paid_amount: number;
}

const ADMIN_COMMISSION_KPI_DEFAULT: AdminCommissionKpi = {
  pending_count: 0, pending_amount: 0,
  approved_count: 0, approved_amount: 0,
  paid_count: 0, paid_amount: 0,
};

export const adminCommissionApi = {
  async getCommissions(
    params?: { page?: number; limit?: number; status?: CommissionStatus }
  ): Promise<CommissionsResponse> {
    try {
      const sp = new URLSearchParams();
      if (params?.page) sp.append('page', String(params.page));
      if (params?.limit) sp.append('limit', String(params.limit));
      if (params?.status) sp.append('status', params.status);
      const qs = sp.toString() ? `?${sp}` : '';

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/commissions${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      const result = await response.json();
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  async getKpi(): Promise<AdminCommissionKpi> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/commissions/kpi`,
        { credentials: 'include' },
      );
      if (!response.ok) return ADMIN_COMMISSION_KPI_DEFAULT;
      const result = await response.json();
      return result.data || ADMIN_COMMISSION_KPI_DEFAULT;
    } catch {
      return ADMIN_COMMISSION_KPI_DEFAULT;
    }
  },

  async getDetail(id: string): Promise<CommissionDetail | null> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/commissions/${id}`,
        { credentials: 'include' },
      );
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch { return null; }
  },

  async calculate(periodStart: string, periodEnd: string): Promise<{ success: boolean; data?: any; error?: string; message?: string }> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/commissions/calculate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
        },
      );
      return await response.json();
    } catch { return { success: false, error: 'NETWORK_ERROR' }; }
  },

  async approve(id: string, notes?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/commissions/${id}/approve`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ notes }),
        },
      );
      return response.ok;
    } catch { return false; }
  },

  async pay(id: string, notes?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/commissions/${id}/pay`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ notes }),
        },
      );
      return response.ok;
    } catch { return false; }
  },

  async cancel(id: string, notes?: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/commissions/${id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'cancelled', notes }),
        },
      );
      return response.ok;
    } catch { return false; }
  },
};

// ==================== Admin Partner Settlement (WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1) ====================

export type PartnerSettlementStatus = 'pending' | 'processing' | 'paid';

export interface PartnerSettlement {
  id: string;
  partner_id: string;
  partner_name?: string;
  partner_email?: string;
  total_commission: number;
  commission_count: number;
  status: PartnerSettlementStatus;
  created_at: string;
  paid_at: string | null;
}

export interface PartnerSettlementItem {
  id: string;
  settlement_id: string;
  commission_id: string;
  commission_amount: number;
  order_number: string;
  order_amount: number;
  commission_rate: number;
  supplier_name: string | null;
  commission_status: string;
  created_at: string;
}

export interface PartnerSettlementDetail extends PartnerSettlement {
  items: PartnerSettlementItem[];
}

export interface PartnerSettlementsResponse {
  data: PartnerSettlement[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// ==================== Admin Partner Monitoring (WO-O4O-ADMIN-PARTNER-MONITORING-V1) ====================

export interface PartnerMonitoringItem {
  partner_id: string;
  name: string;
  email: string;
  orders: number;
  commission: number;
  payable: number;
  paid: number;
  first_commission_at: string | null;
}

export interface PartnerMonitoringKpi {
  total_partners: number;
  total_commission: number;
  total_payable: number;
  total_paid: number;
}

export interface PartnerMonitoringCommission {
  id: string;
  order_id: string;
  order_number: string;
  product_name: string | null;
  store_name: string | null;
  commission_amount: number;
  status: string;
  created_at: string;
}

export interface PartnerMonitoringDetail {
  partner_id: string;
  name: string;
  email: string;
  orders: number;
  commission: number;
  payable: number;
  paid: number;
  commissions: PartnerMonitoringCommission[];
}

export interface PartnerMonitoringListResponse {
  data: PartnerMonitoringItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  kpi: PartnerMonitoringKpi;
}

export const adminPartnerMonitoringApi = {
  async getPartners(params?: { page?: number; limit?: number; search?: string }): Promise<PartnerMonitoringListResponse> {
    try {
      const sp = new URLSearchParams();
      if (params?.page) sp.append('page', String(params.page));
      if (params?.limit) sp.append('limit', String(params.limit));
      if (params?.search) sp.append('search', params.search);
      const qs = sp.toString() ? `?${sp}` : '';
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/partners${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) {
        return {
          data: [],
          meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
          kpi: { total_partners: 0, total_commission: 0, total_payable: 0, total_paid: 0 },
        };
      }
      const result = await response.json();
      return {
        data: result.data || [],
        meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
        kpi: result.kpi || { total_partners: 0, total_commission: 0, total_payable: 0, total_paid: 0 },
      };
    } catch {
      return {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
        kpi: { total_partners: 0, total_commission: 0, total_payable: 0, total_paid: 0 },
      };
    }
  },

  async getDetail(partnerId: string): Promise<PartnerMonitoringDetail | null> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/partners/${partnerId}`,
        { credentials: 'include' },
      );
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch { return null; }
  },
};

export const adminPartnerSettlementApi = {
  /** POST /api/v1/neture/admin/partner-settlements — 정산 배치 생성 */
  async create(partnerId: string): Promise<{ success: boolean; data?: PartnerSettlement; error?: string }> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/partner-settlements`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ partner_id: partnerId }),
        },
      );
      const result = await response.json();
      if (!response.ok) return { success: false, error: result.message || 'Failed' };
      return { success: true, data: result.data };
    } catch { return { success: false, error: 'Network error' }; }
  },

  /** POST /api/v1/neture/admin/partner-settlements/:id/pay — 지급 완료 */
  async pay(id: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/partner-settlements/${id}/pay`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
        },
      );
      return response.ok;
    } catch { return false; }
  },

  /** GET /api/v1/neture/admin/partner-settlements — 목록 */
  async getList(params?: { page?: number; limit?: number; status?: PartnerSettlementStatus }): Promise<PartnerSettlementsResponse> {
    try {
      const sp = new URLSearchParams();
      if (params?.page) sp.append('page', String(params.page));
      if (params?.limit) sp.append('limit', String(params.limit));
      if (params?.status) sp.append('status', params.status);
      const qs = sp.toString() ? `?${sp}` : '';
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/partner-settlements${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      const result = await response.json();
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  /** GET /api/v1/neture/admin/partner-settlements/:id — 상세 */
  async getDetail(id: string): Promise<PartnerSettlementDetail | null> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/partner-settlements/${id}`,
        { credentials: 'include' },
      );
      if (!response.ok) return null;
      const result = await response.json();
      return result.data || null;
    } catch { return null; }
  },
};

// ==================== Admin Registration ====================

export const adminRegistrationApi = {
  async getRequests(filters?: { status?: string }): Promise<any[]> {
    try {
      const qs = filters?.status ? `?status=${filters.status}` : '';
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/neture/admin/requests${qs}`,
        { credentials: 'include' },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('[Admin API] Failed to fetch registration requests:', error);
      return [];
    }
  },
};
