/**
 * GlycoPharm MyPage API
 *
 * WO-O4O-MYPAGE-MY-REQUESTS-INBOX-GLYCO-KCOS-ROUTE-V1
 * WO-O4O-GLYCOPHARM-PHARMACY-PROFILE-EDIT-PAGE-V1
 *
 * Backend:
 *   GET   /api/v1/glycopharm/mypage/my-requests   — 통합 신청 내역
 *   GET   /api/v1/glycopharm/mypage/business-info — 약국 경영자 사업자 정보 조회
 *   PATCH /api/v1/glycopharm/mypage/business-info — 약국 경영자 사업자 정보 수정
 */

import { api } from '@/lib/apiClient';
import type { MyRequestItem } from '@o4o/account-ui';

export interface PharmacyBusinessInfo {
  pharmacyName: string | null;
  businessRegistrationNumber: string | null;
  businessName: string | null;
  representativeName: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessType: string | null;
  businessItem: string | null;
  businessEntityType: string | null;
  businessStartDate: string | null;
  taxInvoiceEmail: string | null;
  pharmacistLicenseNumber: string | null;
}

export interface UpdatePharmacyBusinessInfoPayload {
  pharmacyName?: string;
  businessName?: string;
  representativeName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessType?: string;
  businessItem?: string;
  businessEntityType?: string;
  businessStartDate?: string;
  taxInvoiceEmail?: string;
}

export const mypageApi = {
  getMyRequests: async (): Promise<MyRequestItem[]> => {
    const { data } = await api.get<{ success: boolean; data: MyRequestItem[] }>(
      '/glycopharm/mypage/my-requests',
    );
    return data.data ?? [];
  },

  // WO-O4O-GLYCOPHARM-PHARMACY-PROFILE-EDIT-PAGE-V1
  getBusinessInfo: async (): Promise<PharmacyBusinessInfo> => {
    const { data } = await api.get<{ success: boolean; data: PharmacyBusinessInfo }>(
      '/glycopharm/mypage/business-info',
    );
    return data.data;
  },

  updateBusinessInfo: async (
    payload: UpdatePharmacyBusinessInfoPayload,
  ): Promise<PharmacyBusinessInfo> => {
    const { data } = await api.patch<{ success: boolean; data: PharmacyBusinessInfo }>(
      '/glycopharm/mypage/business-info',
      payload,
    );
    return data.data;
  },
};
