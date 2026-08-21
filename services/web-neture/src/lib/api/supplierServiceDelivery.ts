/**
 * Supplier Service Delivery API — 공급자 직접 opt-in 서비스 제공 설정
 *
 * WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1
 *
 * 공급자가 **운영자 승인 없이** 직접 켜고 끄는 서비스(현재 Pharmacy-Hub)의 제공 설정.
 * 승인 축 서비스(KPA Society · GlycoPharm · K-Cosmetics)는 이 경로가 아니라
 * `supplierApi.updateDistribution()` / 승인 신청 흐름을 쓴다.
 *
 * 백엔드: apps/api-server/src/modules/neture/controllers/supplier-service-delivery.controller.ts
 * 계약:   docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md §3
 */

import { api } from '../apiClient';

/** 프론트 표기용 — 백엔드 `SUPPLIER_OPTIN_SERVICE_KEYS` 와 같은 표를 유지한다. */
export const SUPPLIER_OPTIN_SERVICES: { key: string; label: string; description: string }[] = [
  {
    key: 'pharmacy-hub',
    label: 'Pharmacy-Hub',
    description: '약국 경영자 대상 서비스. 운영자 상품 승인이 없어 제공 시작 즉시 매장 HUB 에 노출됩니다.',
  },
];

export function isSupplierOptinService(key: string | undefined): boolean {
  return !!key && SUPPLIER_OPTIN_SERVICES.some((s) => s.key === key);
}

export interface ServiceDeliveryOfferRow {
  offerId: string;
  masterId: string;
  name: string | null;
  barcode: string | null;
  manufacturerName: string | null;
  regulatoryType: string | null;
  isRegulated: boolean;
  priceGeneral: number;
  isActive: boolean;
  approvalStatus: string;
  distributionType: string;
  serviceKeys: string[] | null;
  /** 이 서비스에 제공 중인가 (`service_keys` 포함 여부) */
  delivered: boolean;
  /** 서비스별 공급가 (`offer_service_prices`) — 없으면 기본 공급가 적용 */
  serviceUnitPrice: number | null;
  effectiveUnitPrice: number | null;
  imageUrl: string | null;
}

export interface ServiceDeliveryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ServiceDeliveryListResult {
  serviceKey: string;
  serviceLabel: string;
  items: ServiceDeliveryOfferRow[];
  pagination: ServiceDeliveryPagination;
}

export interface SetDeliveryResult {
  offerId: string;
  serviceKey: string;
  enabled: boolean;
  changed: boolean;
  /** 서버가 확정한 최종 service_keys — 다른 서비스 키 보존 확인용 */
  serviceKeys: string[];
  distributionType: string;
  unitPrice: number | null;
}

function extractError(error: any): string {
  const data = error?.response?.data;
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.error?.message === 'string') return data.error.message;
  return '요청을 처리하지 못했습니다.';
}

export const supplierServiceDeliveryApi = {
  async listProducts(
    serviceKey: string,
    params: { delivered?: string; q?: string; page?: number; limit?: number },
  ): Promise<{ success: boolean; error?: string; data?: ServiceDeliveryListResult }> {
    try {
      const response = await api.get(`/neture/supplier/services/${serviceKey}/products`, {
        params: {
          delivered: params.delivered || undefined,
          q: params.q || undefined,
          page: params.page ?? 1,
          limit: params.limit ?? 20,
        },
      });
      return { success: true, data: response.data?.data };
    } catch (error) {
      return { success: false, error: extractError(error) };
    }
  },

  async setDelivery(
    serviceKey: string,
    offerId: string,
    input: { enabled: boolean; unitPrice?: number },
  ): Promise<{ success: boolean; error?: string; data?: SetDeliveryResult }> {
    try {
      const response = await api.patch(
        `/neture/supplier/services/${serviceKey}/products/${offerId}/delivery`,
        input,
      );
      return { success: true, data: response.data?.data };
    } catch (error) {
      return { success: false, error: extractError(error) };
    }
  },
};
