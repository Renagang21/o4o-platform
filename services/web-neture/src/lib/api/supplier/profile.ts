import { api } from '../../apiClient';
import type { SupplierProfile, SupplierOrderCondition } from './business.types';
import type { ContactVisibility } from '../neture.js';
import {
  SUPPLIER_ORDER_CONDITION_LOAD_FAILED,
  SUPPLIER_ORDER_CONDITION_NOT_FOUND,
  SUPPLIER_PROFILE_LOAD_FAILED,
  extractApiError,
} from './errors';

// ==================== Supplier Profile API ====================

export const supplierProfileApi = {
  /**
   * WO-O4O-NETURE-SUPPLIER-REMAINING-LOAD-ERROR-CONTRACT-V1 (묶음 4)
   *
   * backend 계약(supplier-management.controller.ts): requireLinkedSupplier 뒤이므로
   * 연결된 공급자 행은 항상 존재 → 200 + data:{...}(필드는 null 일 수 있음).
   * 404 SUPPLIER_NOT_FOUND / 500 은 오류 조건이며 "정상 미존재" 가 아니다.
   * getOnboarding 과 동일하게 조회 실패는 고정 코드로 throw 한다(서버 원문 미노출).
   * 소비처(SupplierActivationGate 등)의 fail-open 은 각 화면이 catch 로 결정한다.
   */
  async getProfile(): Promise<SupplierProfile> {
    let response;
    try {
      response = await api.get('/neture/supplier/profile');
    } catch (error) {
      console.warn('[Supplier Profile API] Failed to fetch profile:', extractApiError(error));
      throw new Error(SUPPLIER_PROFILE_LOAD_FAILED);
    }
    const data = response.data?.data;
    if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data)) {
      console.warn('[Supplier Profile API] Unexpected profile payload shape');
      throw new Error(SUPPLIER_PROFILE_LOAD_FAILED);
    }
    return data as SupplierProfile;
  },

  async updateProfile(data: {
    name?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactWebsite?: string;
    contactKakao?: string;
    contactEmailVisibility?: ContactVisibility;
    contactPhoneVisibility?: ContactVisibility;
    contactWebsiteVisibility?: ContactVisibility;
    contactKakaoVisibility?: ContactVisibility;
    // WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1
    businessNumber?: string;
    representativeName?: string;
    businessZipCode?: string;
    businessAddress?: string;
    businessAddressDetail?: string;
    managerName?: string;
    managerPhone?: string;
    managerEmail?: string;
    businessType?: string;
    businessItem?: string;
    // WO-O4O-SUPPLIER-IDENTITY-...-CANONICALIZATION-V1 §E:
    //   taxInvoiceEmail 은 updateOnboarding 소유 — profile 저장 payload 에서 제거.
    // WO-O4O-NETURE-SUPPLIER-PROFILE-P4-FIELDS-ADD-V1
    //   (저장 위치는 §D 로 organizations.metadata.businessProfile 로 이동)
    businessEntityType?: string;
    businessStartDate?: string;
    // WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
    minOrderAmount?: number | null;
    minOrderSurcharge?: number | null;
    orderConditionNote?: string | null;
    // WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1
    baseShippingFee?: number | null;
    freeShippingThreshold?: number | null;
    averageDispatchDays?: number | null;
    returnExchangeNotice?: string | null;
    shippingStandard?: string | null;
    shippingIsland?: string | null;
    shippingMountain?: string | null;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.patch('/neture/supplier/profile', data);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  // WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
  /**
   * WO-O4O-NETURE-SUPPLIER-ORDER-CONDITION-LOAD-ERROR-CONTRACT-V1
   *
   * backend 계약(정적 확인 — supplier.service.ts:528 / neture.routes.ts:246):
   *   ACTIVE 공급자면 **항상 200 + 객체** 를 반환한다.
   *   "조건 미설정" 은 별도 null 상태가 아니라 객체 내부 필드가 null 인 것이다.
   *   404 SUPPLIER_NOT_FOUND 는 공급자 부재 또는 비-ACTIVE = 오류 상태다.
   *   401 미인증 · 403 NO_SUPPLIER(공급자 미연결) — 둘 다 LOAD_FAILED 로 접는다.
   * 따라서 정상 null 반환 경로가 없으므로 반환 타입에서 null 을 제거하고 실패는 throw 한다.
   */
  async getOrderCondition(supplierId: string): Promise<SupplierOrderCondition> {
    let response;
    try {
      response = await api.get(
        `/neture/suppliers/${encodeURIComponent(supplierId)}/order-condition`,
      );
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      console.warn('[Supplier API] Failed to fetch order condition:', extractApiError(error));
      throw new Error(
        status === 404 ? SUPPLIER_ORDER_CONDITION_NOT_FOUND : SUPPLIER_ORDER_CONDITION_LOAD_FAILED,
      );
    }
    const data = response.data?.data;
    if (
      response.data?.success !== true ||
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data)
    ) {
      console.warn('[Supplier API] Unexpected order condition payload shape');
      throw new Error(SUPPLIER_ORDER_CONDITION_LOAD_FAILED);
    }
    return data as SupplierOrderCondition;
  },
};
