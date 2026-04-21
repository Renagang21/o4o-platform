/**
 * Tablet Operator API Client
 *
 * WO-TABLET-OPERATOR-UI-V1
 *
 * 타블렛 채널 노출 설정 관리:
 * - TABLET 채널 상태 조회
 * - 진열 상품 목록 + 타블렛 노출 상태 조회
 * - 타블렛 노출 ON/OFF 토글
 */

import { authClient } from '@o4o/auth-client';

const BASE = '/api/v1/store/tablet/operator';

// ============================================
// Types
// ============================================

export interface TabletChannel {
  id: string;
  channelType: 'TABLET';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED';
  approvedAt: string | null;
  createdAt: string;
}

export interface TabletProductItem {
  listingId: string;
  offerId: string;
  masterId: string;
  listingActive: boolean;
  serviceKey: string;
  productName: string | null;
  regulatoryName: string | null;
  specification: string | null;
  supplierName: string | null;
  priceGeneral: number | null;
  imageUrl: string | null;
  tabletVisible: boolean;
}

export interface TabletProductListResponse {
  items: TabletProductItem[];
  total: number;
  page: number;
  limit: number;
  tabletChannelId: string | null;
}

// ============================================
// API
// ============================================

export const tabletOperatorApi = {
  /**
   * TABLET 채널 상태 조회
   */
  async getChannel(): Promise<{ exists: boolean; channel: TabletChannel | null }> {
    const res = await authClient.api.get<any>(`${BASE}/channel`);
    return res.data?.data ?? { exists: false, channel: null };
  },

  /**
   * 진열 상품 목록 + 타블렛 노출 상태
   */
  async listProducts(params?: {
    search?: string;
    visible?: boolean;
    page?: number;
    limit?: number;
  }): Promise<TabletProductListResponse> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.visible !== undefined) q.set('visible', String(params.visible));
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));

    const res = await authClient.api.get<any>(`${BASE}/products?${q.toString()}`);
    return (
      res.data?.data ?? { items: [], total: 0, page: 1, limit: 20, tabletChannelId: null }
    );
  },

  /**
   * 타블렛 노출 ON/OFF 토글
   */
  async setVisibility(
    listingId: string,
    visible: boolean,
  ): Promise<{ listingId: string; tabletVisible: boolean }> {
    const res = await authClient.api.patch<any>(
      `${BASE}/products/${listingId}/visibility`,
      { visible },
    );
    return res.data?.data ?? { listingId, tabletVisible: visible };
  },
};
