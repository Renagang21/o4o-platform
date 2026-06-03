/**
 * Admin APIs - Operator, Supplier, Product, Master, Service Approval, Registration, Settlement
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 */
import { api } from './client.js';
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

export interface OperatorActionResult {
  success: boolean;
  error?: string;
  code?: string;
}

export const adminOperatorApi = {
  async getOperators(includeInactive = false): Promise<NetureOperatorInfo[]> {
    try {
      const qs = includeInactive ? '?includeInactive=true' : '';
      const response = await api.get(`/neture/admin/operators${qs}`);
      return response.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Admin API] Operators API not available');
      return [];
    }
  },

  async deactivateOperator(userId: string): Promise<OperatorActionResult> {
    try {
      await api.patch(`/neture/admin/operators/${userId}/deactivate`);
      return { success: true };
    } catch (error: any) {
      const data = error?.response?.data;
      return { success: false, error: data?.error || '권한 해제에 실패했습니다', code: data?.code };
    }
  },

  async reactivateOperator(userId: string): Promise<OperatorActionResult> {
    try {
      await api.patch(`/neture/admin/operators/${userId}/reactivate`);
      return { success: true };
    } catch (error: any) {
      const data = error?.response?.data;
      return { success: false, error: data?.error || '권한 복원에 실패했습니다', code: data?.code };
    }
  },

  async createOperator(
    email: string,
    role: 'neture:admin' | 'neture:operator',
    name?: string,
    password?: string,
  ): Promise<OperatorActionResult & { data?: { userId: string; name: string; email: string; role: string; isNewUser: boolean; restored: boolean } }> {
    try {
      const response = await api.post('/neture/admin/operators', { email, role, name, password });
      return { success: true, data: response.data.data };
    } catch (error: any) {
      const data = error?.response?.data;
      return { success: false, error: data?.error || '운영자 추가에 실패했습니다', code: data?.code };
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
  businessNumber?: string;
  taxInvoiceEmail?: string;
  createdAt: string;
  // WO-O4O-NETURE-OPERATOR-MEMBER-SUPPLIER-STATUS-VISIBILITY-V1:
  // backend(getAllSuppliers)는 userId 를 내려주나 타입에 누락돼 있던 것을 명시 (회원 목록 매핑용).
  userId?: string;
}

export const adminSupplierApi = {
  async getSuppliers(status?: string): Promise<AdminSupplier[]> {
    try {
      const qs = status ? `?status=${status}` : '';
      const response = await api.get(`/neture/admin/suppliers${qs}`);
      return response.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Admin API] Failed to fetch suppliers:', error);
      return [];
    }
  },

  async getPendingSuppliers(): Promise<AdminSupplier[]> {
    try {
      const response = await api.get('/neture/admin/suppliers/pending');
      return response.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Admin API] Failed to fetch pending suppliers:', error);
      return [];
    }
  },

  async approveSupplier(id: string): Promise<boolean> {
    try {
      await api.post(`/neture/admin/suppliers/${id}/approve`);
      return true;
    } catch { return false; }
  },

  async rejectSupplier(id: string, reason?: string): Promise<boolean> {
    try {
      await api.post(`/neture/admin/suppliers/${id}/reject`, { reason });
      return true;
    } catch { return false; }
  },

  async deactivateSupplier(id: string): Promise<boolean> {
    try {
      await api.post(`/neture/admin/suppliers/${id}/deactivate`);
      return true;
    } catch { return false; }
  },
};

// ==================== Operator Supplier ====================
// WO-O4O-NETURE-SUPPLIER-ACTIVATION-VISIBILITY-AND-ACTION-QUEUE-FIX-V1
//   /admin/suppliers/* 와 동일한 NetureService 를 호출하지만 backend 가 operator scope guard
//   로 별도 노출하는 endpoint. AdminSupplier 와 schema 동일 — 타입 재사용.
//   admin 의 deactivate 는 의도적으로 operator 노출 제외 (활성 공급자 비활성화는 admin 정책).

export const operatorSupplierApi = {
  async getSuppliers(status?: string): Promise<AdminSupplier[]> {
    try {
      const qs = status ? `?status=${status}` : '';
      const response = await api.get(`/neture/operator/suppliers${qs}`);
      return response.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Operator API] Failed to fetch suppliers:', error);
      return [];
    }
  },

  async getPendingSuppliers(): Promise<AdminSupplier[]> {
    try {
      const response = await api.get('/neture/operator/suppliers/pending');
      return response.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Operator API] Failed to fetch pending suppliers:', error);
      return [];
    }
  },

  async approveSupplier(id: string): Promise<boolean> {
    try {
      await api.post(`/neture/operator/suppliers/${id}/approve`);
      return true;
    } catch { return false; }
  },

  async rejectSupplier(id: string, reason?: string): Promise<boolean> {
    try {
      await api.post(`/neture/operator/suppliers/${id}/reject`, { reason });
      return true;
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

      const response = await api.get(`/neture/admin/settlements${qs}`);
      const result = response.data;
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch (error) {
      console.warn('[Admin Settlement API] Failed to fetch settlements:', error);
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  async getKpi(): Promise<AdminSettlementKpi> {
    try {
      const response = await api.get('/neture/admin/settlements/kpi');
      return response.data.data || ADMIN_SETTLEMENT_KPI_DEFAULT;
    } catch {
      return ADMIN_SETTLEMENT_KPI_DEFAULT;
    }
  },

  async getDetail(id: string): Promise<SettlementDetail | null> {
    try {
      const response = await api.get(`/neture/admin/settlements/${id}`);
      return response.data.data || null;
    } catch { return null; }
  },

  async calculate(periodStart: string, periodEnd: string): Promise<{ success: boolean; data?: any; error?: string; message?: string }> {
    try {
      const response = await api.post('/neture/admin/settlements/calculate', {
        period_start: periodStart,
        period_end: periodEnd,
      });
      return response.data;
    } catch { return { success: false, error: 'NETWORK_ERROR' }; }
  },

  async approve(id: string, notes?: string): Promise<boolean> {
    try {
      await api.patch(`/neture/admin/settlements/${id}/approve`, { notes });
      return true;
    } catch { return false; }
  },

  async pay(id: string, notes?: string): Promise<boolean> {
    try {
      await api.patch(`/neture/admin/settlements/${id}/pay`, { notes });
      return true;
    } catch { return false; }
  },

  async cancel(id: string, notes?: string): Promise<boolean> {
    try {
      await api.patch(`/neture/admin/settlements/${id}/status`, { status: 'cancelled', notes });
      return true;
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
  consumerShortDescription?: string | null;
  consumerDetailDescription?: string | null;
  businessShortDescription?: string | null;
  businessDetailDescription?: string | null;
}

export const adminProductApi = {
  async getProducts(status?: string): Promise<AdminProduct[]> {
    try {
      const qs = status ? `?status=${status}` : '';
      const response = await api.get(`/neture/admin/products${qs}`);
      return response.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Admin API] Failed to fetch products:', error);
      return [];
    }
  },

  async getPendingProducts(): Promise<AdminProduct[]> {
    try {
      const response = await api.get('/neture/admin/products/pending');
      return response.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Admin API] Failed to fetch pending products:', error);
      return [];
    }
  },

  async approveProduct(id: string): Promise<boolean> {
    try {
      await api.post(`/neture/admin/products/${id}/approve`);
      return true;
    } catch { return false; }
  },

  async rejectProduct(id: string, reason?: string): Promise<boolean> {
    try {
      await api.post(`/neture/admin/products/${id}/reject`, { reason });
      return true;
    } catch { return false; }
  },

  /** V3: Batch approve */
  async batchApprove(ids: string[]) {
    const res = await api.post('/neture/admin/products/batch-approve', { ids });
    return res.data;
  },

  /** V3: Batch reject */
  async batchReject(ids: string[], reason?: string) {
    const res = await api.post('/neture/admin/products/batch-reject', { ids, reason });
    return res.data;
  },
};

// ==================== Admin Master ====================

export interface AdminMaster {
  id: string;
  barcode: string;
  regulatoryType: string;
  regulatoryName: string;
  name: string;
  marketingName?: string | null;
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
      const response = await api.get('/neture/admin/masters');
      return response.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Admin API] Failed to fetch masters:', error);
      return [];
    }
  },

  async getMasterByBarcode(barcode: string): Promise<AdminMaster | null> {
    try {
      const response = await api.get(`/neture/admin/masters/barcode/${encodeURIComponent(barcode)}`);
      return response.data.data || null;
    } catch (error) {
      console.warn('[Admin API] Failed to fetch master by barcode:', error);
      return null;
    }
  },

  async resolveMaster(data: { barcode: string; manualData?: Record<string, unknown> }): Promise<boolean> {
    try {
      await api.post('/neture/admin/masters/resolve', data);
      return true;
    } catch { return false; }
  },

  async updateMaster(id: string, data: Partial<AdminMaster>): Promise<boolean> {
    try {
      await api.patch(`/neture/admin/masters/${id}`, data);
      return true;
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
      const response = await api.get(`/neture/admin/service-approvals${qs}`);
      return response.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Admin API] Failed to fetch service approvals:', error);
      return [];
    }
  },

  async approveServiceApproval(id: string): Promise<boolean> {
    try {
      await api.post(`/neture/admin/service-approvals/${id}/approve`);
      return true;
    } catch { return false; }
  },

  async rejectServiceApproval(id: string, reason?: string): Promise<boolean> {
    try {
      await api.post(`/neture/admin/service-approvals/${id}/reject`, { reason });
      return true;
    } catch { return false; }
  },

  async revokeServiceApproval(id: string, reason?: string): Promise<boolean> {
    try {
      await api.post(`/neture/admin/service-approvals/${id}/revoke`, { reason });
      return true;
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

      const response = await api.get(`/neture/admin/commissions${qs}`);
      const result = response.data;
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  async getKpi(): Promise<AdminCommissionKpi> {
    try {
      const response = await api.get('/neture/admin/commissions/kpi');
      return response.data.data || ADMIN_COMMISSION_KPI_DEFAULT;
    } catch {
      return ADMIN_COMMISSION_KPI_DEFAULT;
    }
  },

  async getDetail(id: string): Promise<CommissionDetail | null> {
    try {
      const response = await api.get(`/neture/admin/commissions/${id}`);
      return response.data.data || null;
    } catch { return null; }
  },

  async calculate(periodStart: string, periodEnd: string): Promise<{ success: boolean; data?: any; error?: string; message?: string }> {
    try {
      const response = await api.post('/neture/admin/commissions/calculate', {
        period_start: periodStart,
        period_end: periodEnd,
      });
      return response.data;
    } catch { return { success: false, error: 'NETWORK_ERROR' }; }
  },

  async approve(id: string, notes?: string): Promise<boolean> {
    try {
      await api.patch(`/neture/admin/commissions/${id}/approve`, { notes });
      return true;
    } catch { return false; }
  },

  async pay(id: string, notes?: string): Promise<boolean> {
    try {
      await api.patch(`/neture/admin/commissions/${id}/pay`, { notes });
      return true;
    } catch { return false; }
  },

  async cancel(id: string, notes?: string): Promise<boolean> {
    try {
      await api.patch(`/neture/admin/commissions/${id}/status`, { status: 'cancelled', notes });
      return true;
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
      const response = await api.get(`/neture/admin/partners${qs}`);
      const result = response.data;
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
      const response = await api.get(`/neture/admin/partners/${partnerId}`);
      return response.data.data || null;
    } catch { return null; }
  },
};

export const adminPartnerSettlementApi = {
  /** POST /api/v1/neture/admin/partner-settlements — 정산 배치 생성 */
  async create(partnerId: string): Promise<{ success: boolean; data?: PartnerSettlement; error?: string }> {
    try {
      const response = await api.post('/neture/admin/partner-settlements', { partner_id: partnerId });
      return { success: true, data: response.data.data };
    } catch (error: any) {
      const result = error?.response?.data;
      return { success: false, error: result?.message || 'Failed' };
    }
  },

  /** POST /api/v1/neture/admin/partner-settlements/:id/pay — 지급 완료 */
  async pay(id: string): Promise<boolean> {
    try {
      await api.post(`/neture/admin/partner-settlements/${id}/pay`, {});
      return true;
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
      const response = await api.get(`/neture/admin/partner-settlements${qs}`);
      const result = response.data;
      return { data: result.data || [], meta: result.meta || { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  /** GET /api/v1/neture/admin/partner-settlements/:id — 상세 */
  async getDetail(id: string): Promise<PartnerSettlementDetail | null> {
    try {
      const response = await api.get(`/neture/admin/partner-settlements/${id}`);
      return response.data.data || null;
    } catch { return null; }
  },
};

// ==================== Admin Registration (Legacy — product_approvals) ====================

export const adminRegistrationApi = {
  async getRequests(filters?: { status?: string }): Promise<any[]> {
    try {
      const qs = filters?.status ? `?status=${filters.status}` : '';
      const response = await api.get(`/neture/admin/requests${qs}`);
      return response.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Admin API] Failed to fetch registration requests:', error);
      return [];
    }
  },
};

// ==================== Operator Registration (users + service_memberships) ====================
// WO-O4O-NETURE-REGISTRATION-SYSTEM-FIX-V1

export interface RegistrationRecord {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  service: string;
  companyName?: string;
  businessNumber?: string;
  licenseNumber?: string;
  // WO-O4O-NETURE-SUPPLIER-REGISTRATION-BUSINESS-INFO-V1
  representativeName?: string;
  taxInvoiceEmail?: string;
  contactName?: string;
  managerPhone?: string;
  businessAddress?: string;
  businessAddressDetail?: string;
  businessType?: string;
  // WO-O4O-OPERATOR-BUSINESS-REGISTRATION-DISPLAY-ALIGNMENT-V1:
  //   사업자등록증 3 canonical 추가 필드 (업태 businessType 는 기존). users.businessInfo 출처.
  businessItem?: string;
  businessEntityType?: string;
  businessStartDate?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectReason?: string;
  operatorNotes?: string;
  supplierStatus?: string;
}

export const operatorRegistrationApi = {
  async getRegistrations(filters?: { status?: string }): Promise<RegistrationRecord[]> {
    const qs = filters?.status ? `?status=${filters.status}` : '';
    const response = await api.get(`/neture/operator/registrations${qs}`);
    return response.data.data || [];
  },

  async approve(userId: string): Promise<{ success: boolean }> {
    const response = await api.post(
      `/neture/operator/registrations/${userId}/approve`,
      {},
    );
    return response.data;
  },

  async reject(userId: string, reason: string): Promise<{ success: boolean }> {
    const response = await api.post(
      `/neture/operator/registrations/${userId}/reject`,
      { reason },
    );
    return response.data;
  },

  async updateNotes(userId: string, notes: string): Promise<{ success: boolean }> {
    const response = await api.patch(
      `/neture/operator/registrations/${userId}/notes`,
      { notes },
    );
    return response.data;
  },

  async batchProcess(ids: string[], action: 'approve' | 'reject', reason?: string): Promise<any> {
    const response = await api.post('/neture/operator/registrations/batch', {
      ids,
      action,
      ...(reason ? { reason } : {}),
    });
    return response.data;
  },
};

// ==================== Operator Contact Messages ====================
// WO-O4O-NETURE-OPERATOR-CONTACT-MESSAGES-OPERATOR-SCOPE-V1
//   /admin/contact-messages 와 의도적으로 분리한 별도 endpoint. operator 화면 노출
//   안전 필드만 응답. adminNotes / ipAddress / userAgent 없음. message 는 preview 만.

export interface OperatorContactMessage {
  id: string;
  contactType: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  /** 본문 preview (앞 160자). 상세 처리는 admin 화면. */
  messagePreview: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperatorContactPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OperatorContactListParams {
  contactType?: 'supplier' | 'partner' | 'service' | 'other';
  status?: 'new' | 'in_progress' | 'resolved';
  page?: number;
  limit?: number;
}

export const operatorContactApi = {
  async list(params: OperatorContactListParams = {}): Promise<{ items: OperatorContactMessage[]; pagination: OperatorContactPagination } | null> {
    try {
      const qs = new URLSearchParams();
      if (params.contactType) qs.set('contactType', params.contactType);
      if (params.status) qs.set('status', params.status);
      if (params.page) qs.set('page', String(params.page));
      if (params.limit) qs.set('limit', String(params.limit));
      const suffix = qs.toString() ? `?${qs}` : '';
      const response = await api.get(`/neture/operator/contact-messages${suffix}`);
      return response.data?.data ?? null;
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Operator Contact API] Failed to list:', error);
      return null;
    }
  },

  /** supplier/partner 문의 일괄 mark-read (status='new' → 'in_progress'). */
  async bulkMarkRead(): Promise<{ updated: number; scope: string[] } | null> {
    try {
      const response = await api.post('/neture/operator/actions/execute/inquiries-mark-read');
      return response.data?.data ?? null;
    } catch (error: any) {
      if (error?.response?.status === 403) throw new Error('접근 권한이 없습니다');
      console.warn('[Operator Contact API] Failed to mark-read:', error);
      return null;
    }
  },
};
