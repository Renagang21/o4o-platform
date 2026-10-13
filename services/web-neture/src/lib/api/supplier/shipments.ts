import { api } from '../../apiClient';
import type { Shipment } from '../store.js';
import {
  SUPPLIER_SHIPMENT_LOAD_FAILED,
  SUPPLIER_SHIPMENT_ORDER_NOT_FOUND,
  extractApiError,
} from './errors';

export const supplierShipmentsApi = {
  // Shipment
  async createShipment(
    orderId: string,
    data: { carrier_code: string; carrier_name: string; tracking_number: string },
  ): Promise<{ success: boolean; data?: Shipment; error?: string }> {
    try {
      const response = await api.post(`/neture/supplier/orders/${orderId}/shipment`, data);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },

  /**
   * WO-O4O-NETURE-SUPPLIER-SHIPMENT-LOAD-ERROR-CONTRACT-V1
   *
   * backend 계약(정적 확인 — supplier-order.controller.ts:246):
   *   200 + data:null  → 주문은 존재하나 배송 정보 미생성(정상 미출고)
   *   200 + data:{...} → 배송 정보 존재
   *   404 ORDER_NOT_FOUND → 주문 미존재 또는 타인 소유(존재 은닉)
   *   401 → 미인증 · 403 NO_SUPPLIER → 공급자 미연결(WO-O4O-NETURE-AUTH-ERROR-CONTRACT-AND-LEGACY-TOKEN-RECOVERY-FIX-V1)
   *   500 → 서버 오류
   *
   * "정상 미출고" 는 실재하는 상태이므로 null 반환을 유지하고, 실패만 고정 코드로 throw 한다.
   */
  async getShipment(orderId: string): Promise<Shipment | null> {
    let response;
    try {
      response = await api.get(`/neture/supplier/orders/${encodeURIComponent(orderId)}/shipment`);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      console.warn('[Supplier API] Failed to fetch shipment:', extractApiError(error));
      throw new Error(
        status === 404 ? SUPPLIER_SHIPMENT_ORDER_NOT_FOUND : SUPPLIER_SHIPMENT_LOAD_FAILED,
      );
    }
    if (response.data?.success !== true) {
      console.warn('[Supplier API] Unexpected shipment payload shape');
      throw new Error(SUPPLIER_SHIPMENT_LOAD_FAILED);
    }
    const data = response.data.data;
    if (data === null || data === undefined) return null;
    if (typeof data !== 'object' || Array.isArray(data)) {
      console.warn('[Supplier API] Unexpected shipment payload shape');
      throw new Error(SUPPLIER_SHIPMENT_LOAD_FAILED);
    }
    return data as Shipment;
  },

  async updateShipmentStatus(
    shipmentId: string,
    data: { status: string; tracking_number?: string },
  ): Promise<{ success: boolean; data?: Shipment; error?: string }> {
    try {
      const response = await api.patch(`/neture/supplier/shipments/${shipmentId}`, data);
      return response.data;
    } catch (error) {
      return { success: false, error: extractApiError(error) };
    }
  },
};
