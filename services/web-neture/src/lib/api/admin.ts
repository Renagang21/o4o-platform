import { createNetureServiceApi } from '@o4o/operator-core-ui/modules/neture-service-operations';
import { createSupplierOperatorApi } from '@o4o/operator-core-ui/modules/supplier-operations';
import { api } from './client.js';
import {createAdminSettlementApi} from '@o4o/operator-core-ui/modules/neture-service-operations';
import { PROFILE_FIELD_LABELS } from '@o4o/operator-core-ui/modules/supplier-operations';

export type { AdminSupplier, SupplierApproveResult, SupplierGovernanceResult, GovernanceSupplier, SupplierListSummary, SupplierPagedResult, SupplierBatchResultItem } from '@o4o/operator-core-ui/modules/supplier-operations';

export { PROFILE_FIELD_LABELS };
/**
 * Admin APIs - Operator, Supplier, Product, Master, Service Approval, Registration, Settlement
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 */




// WO-O4O-NETURE-LEGACY-ADMIN-OPERATOR-API-RETIREMENT-V1:
//   Neture 전용 운영자 관리 API(`adminOperatorApi` 4개 함수 · `NetureOperatorInfo` ·
//   `OperatorActionResult`)는 은퇴했다. 운영자/관리자 부여·해제는 중앙 관리자
//   `admin.neture.co.kr/operators` 가 정본이며, Neture `/admin/operators` 는 안내 화면이다.
//   백엔드 `/api/v1/neture/admin/operators*` 4개 route 도 함께 제거됐다.

// ==================== Admin Supplier ====================



// WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
// 프로필 필드 코드 → 한글 라벨 (운영자/공급자 화면 공용 — 승인 차단이 아닌 보완 안내용)

/** @deprecated PROFILE_FIELD_LABELS 사용 */
export const ACTIVATION_FIELD_LABELS = PROFILE_FIELD_LABELS;



// WO-O4O-NETURE-SUPPLIER-APPROVAL-CONSOLE-AND-ADMIN-GOVERNANCE-SEPARATION-V1 §6/§7:
// 상태 관리(비활성화/재활성화) 결과. 409(SUPPLIER_DEACTIVATION_BLOCKED) 시 차단 건수를 함께 전달.


// §5: 상태 관리 목록 행 (ACTIVE/INACTIVE 전용).


// WO-O4O-FINAL-CODE-ONLY-RETIREMENT-CLOSURE-V1 §8:
// admin 전용 승인 API(adminSupplierApi.getPendingSuppliers/approveSupplier/rejectSupplier, adminProductApi)는 은퇴했다.
// canonical 승인 client 는 operatorSupplierApi / operatorProductApi 이다.


// ==================== Operator Supplier ====================
// WO-O4O-NETURE-SUPPLIER-ACTIVATION-VISIBILITY-AND-ACTION-QUEUE-FIX-V1
//   /admin/suppliers/* 와 동일한 NetureService 를 호출하지만 backend 가 operator scope guard
//   로 별도 노출하는 endpoint. AdminSupplier 와 schema 동일 — 타입 재사용.
//   admin 의 deactivate 는 의도적으로 operator 노출 제외 (활성 공급자 비활성화는 admin 정책).

// WO-O4O-NETURE-OPERATOR-SUPPLIER-APPROVAL-STANDARD-LIST-AND-MEMBER-IA-V1
// O4O 표준 리스트(paged) + 일괄 처리(batch) 응답 계약.








// ==================== Admin Settlement ====================

export const adminSettlementApi = createAdminSettlementApi(api);

// ==================== Admin Product ====================

export type { AdminProduct } from '@o4o/operator-core-ui/modules/neture-product-operations';

// WO-O4O-ADMIN-PRODUCT-APPROVAL-BACKEND-PAGINATION-V1
export interface AdminProductPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AdminProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'approvalStatus' | 'distributionType' | 'priceGeneral' | 'isActive';
  sortOrder?: 'asc' | 'desc';
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  distributionType?: 'PUBLIC' | 'SERVICE' | 'PRIVATE';
  isActive?: boolean;
  supplierId?: string;
}

export interface AdminProductSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

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

// (은퇴) Admin Commission · Admin Partner Settlement · Admin Partner Monitoring — WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1

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
      throw error;
    }
  },
};

// ==================== Operator Registration (users + service_memberships) ====================
// WO-O4O-NETURE-REGISTRATION-SYSTEM-FIX-V1

export type { RegistrationRecord, OperatorContactMessage, OperatorContactPagination, OperatorContactListParams } from '@o4o/operator-core-ui/modules/neture-service-operations';
export const { operatorRegistrationApi, operatorContactApi } = createNetureServiceApi(api);

export const { operatorSupplierApi, adminSupplierApi } = createSupplierOperatorApi(api);
