/**
 * K-Cosmetics 매장 · 사업자 정보 API — web-k-cosmetics `api/mypage.ts` 중 매장 화면(StoreInfoPage)이 쓰는 부분만 이식
 *   (CHECK-O4O-URL-FIRST-CENSUS-V1 §21-15). 내 신청 내역(kcosMyRequestsApi · forumApi 의존)은 매장 화면이 쓰지 않아 옮기지 않는다.
 *
 *   GET   /cosmetics/mypage/business-info — 매장 경영자 사업자 정보 (canonical)
 *   PATCH /cosmetics/mypage/business-info — 수정
 */

import { api } from '../lib/apiClient';

// ── WO-O4O-KCOSMETICS-STORE-PROFILE-EDIT-PAGE-V1 ─────────────────────────

export interface CosmeticsBusinessInfo {
  storeName: string | null;
  businessRegistrationNumber: string | null;
  businessName: string | null;
  representativeName: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  // 회사이메일(회사/대표 업무 이메일) / 담당자이메일 — WO-O4O-KCOSMETICS-BUSINESS-CONTACT-FIELDS-UI-EXTEND-V1
  businessEmail: string | null;
  contactEmail: string | null;
  businessType: string | null;
  businessItem: string | null;
  businessEntityType: string | null;
  businessStartDate: string | null;
  taxInvoiceEmail: string | null;
}

export interface UpdateCosmeticsBusinessInfoPayload {
  storeName?: string;
  businessName?: string;
  representativeName?: string;
  businessAddress?: string;
  businessPhone?: string;
  // WO-O4O-KCOSMETICS-BUSINESS-CONTACT-FIELDS-UI-EXTEND-V1
  businessEmail?: string;
  contactEmail?: string;
  businessType?: string;
  businessItem?: string;
  businessEntityType?: string;
  businessStartDate?: string;
  taxInvoiceEmail?: string;
}

export const cosmeticsMypageApi = {
  getBusinessInfo: async (): Promise<CosmeticsBusinessInfo> => {
    const { data } = await api.get<{ success: boolean; data: CosmeticsBusinessInfo }>(
      '/cosmetics/mypage/business-info',
    );
    return data.data;
  },

  updateBusinessInfo: async (
    payload: UpdateCosmeticsBusinessInfoPayload,
  ): Promise<CosmeticsBusinessInfo> => {
    const { data } = await api.patch<{ success: boolean; data: CosmeticsBusinessInfo }>(
      '/cosmetics/mypage/business-info',
      payload,
    );
    return data.data;
  },
};

