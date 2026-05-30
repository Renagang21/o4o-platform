/**
 * Pharmacy Info API Client
 *
 * WO-KPA-PHARMACY-INFO-EDIT-FLOW-V1
 *
 * GET  /pharmacy/info — 약국 기본 정보 조회
 * PUT  /pharmacy/info — 약국 기본 정보 수정
 */

import { apiClient } from './client';

export interface StoreAddress {
  zipCode?: string;
  baseAddress: string;
  detailAddress?: string;
  region?: string;
}

export interface PharmacyInfoData {
  organizationId: string;
  name: string;
  phone: string | null;
  businessNumber: string | null;
  address: string | null;
  addressDetail: StoreAddress | null;
  taxInvoiceEmail: string | null;
  ownerPhone: string | null;
  ceoName: string | null;
  contactName: string | null;
  managerPhone: string | null;
  storeSlug: string | null;
  // WO-O4O-MYPAGE-BUSINESS-INFO-EDIT-P2-P4-ADD-V1: 사업자등록증 P2/P4 fields (users.businessInfo SSOT)
  businessType: string | null;
  businessItem: string | null;
  businessEntityType: string | null;
  businessStartDate: string | null;
}

export interface UpdatePharmacyInfoPayload {
  name: string;
  phone?: string;
  addressDetail?: StoreAddress;
  taxInvoiceEmail?: string;
  ownerPhone?: string;
  ceoName?: string;
  contactName?: string;
  managerPhone?: string;
  // WO-O4O-MYPAGE-BUSINESS-INFO-EDIT-P2-P4-ADD-V1
  businessType?: string;
  businessItem?: string;
  businessEntityType?: string;
  businessStartDate?: string;
}

export async function getPharmacyInfo(): Promise<PharmacyInfoData | null> {
  const response = await apiClient.get<{ success: boolean; data: PharmacyInfoData | null }>(
    '/pharmacy/info'
  );
  return response.data;
}

/**
 * Get store slug from pharmacy info.
 * Used by pages that need the store slug for store channel APIs
 * (layout, template, blog, tablet).
 */
export async function getStoreSlug(): Promise<string | null> {
  const info = await getPharmacyInfo();
  return info?.storeSlug || null;
}

export async function updatePharmacyInfo(data: UpdatePharmacyInfoPayload): Promise<PharmacyInfoData> {
  const response = await apiClient.put<{ success: boolean; data: PharmacyInfoData }>(
    '/pharmacy/info',
    data
  );
  return response.data;
}
