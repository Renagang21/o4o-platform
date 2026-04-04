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
}

export interface UpdatePharmacyInfoPayload {
  name: string;
  phone?: string;
  addressDetail?: StoreAddress;
  taxInvoiceEmail?: string;
  ownerPhone?: string;
}

export async function getPharmacyInfo(): Promise<PharmacyInfoData | null> {
  const response = await apiClient.get<{ success: boolean; data: PharmacyInfoData | null }>(
    '/pharmacy/info'
  );
  return response.data;
}

export async function updatePharmacyInfo(data: UpdatePharmacyInfoPayload): Promise<PharmacyInfoData> {
  const response = await apiClient.put<{ success: boolean; data: PharmacyInfoData }>(
    '/pharmacy/info',
    data
  );
  return response.data;
}
