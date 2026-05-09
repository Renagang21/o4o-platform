/**
 * Tablet API Client — Public (no auth)
 *
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 * WO-O4O-TABLET-IDLE-PLAYLIST-CONFIG-V1: fetchTabletIdle 추가
 *
 * Calls /stores/:slug/tablet/* endpoints directly.
 * No authentication required for tablet kiosk mode.
 * Uses api instance (no token injected for public endpoints, interceptor is harmless).
 */

import { api } from '../lib/apiClient';
import type { IdlePlaylistItem } from '@o4o/tablet-kiosk-core';

export interface TabletProduct {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  images?: Array<{ url: string }>;
  category: string;
  stock_quantity: number;
  description?: string;
  short_description?: string;
  channel_price?: number;
}

export interface InterestSubmitResult {
  requestId: string;
  status: string;
  productName: string;
  createdAt: string;
}

export interface InterestStatusDetail {
  id: string;
  status: 'REQUESTED' | 'ACKNOWLEDGED' | 'COMPLETED' | 'CANCELLED';
  productName: string;
  customerName?: string;
  customerNote?: string;
  createdAt: string;
  acknowledgedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export async function fetchTabletProducts(
  slug: string,
  params?: { page?: number; limit?: number; category?: string; q?: string },
): Promise<{ data: TabletProduct[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.category) query.set('category', params.category);
  if (params?.q) query.set('q', params.q);

  const qs = query.toString();
  const url = `/stores/${encodeURIComponent(slug)}/tablet/products${qs ? `?${qs}` : ''}`;
  const res = await api.get(url);
  const json = res.data;
  if (!json.success) throw new Error(json.error?.message || 'Failed to fetch products');
  return { data: json.data, meta: json.meta };
}

export async function submitTabletInterest(
  slug: string,
  body: { masterId: string; customerName?: string; customerNote?: string },
): Promise<InterestSubmitResult> {
  const url = `/stores/${encodeURIComponent(slug)}/tablet/interest`;
  const res = await api.post(url, body);
  const json = res.data;
  if (!json.success) throw new Error(json.error?.message || '관심 요청 생성에 실패했습니다.');
  return json.data;
}

export async function checkTabletInterestStatus(
  slug: string,
  interestId: string,
): Promise<InterestStatusDetail> {
  const url = `/stores/${encodeURIComponent(slug)}/tablet/interest/${interestId}`;
  const res = await api.get(url);
  const json = res.data;
  if (!json.success) throw new Error(json.error?.message || '요청 조회에 실패했습니다.');
  return json.data;
}

// ==================== Idle Playlist API (WO-O4O-TABLET-IDLE-PLAYLIST-CONFIG-V1) ====================

/**
 * 매장 idle playlist 조회 (store-level 설정).
 * 값이 없거나 에러 발생 시 빈 배열 반환 — kiosk 는 placeholder 표시.
 */
export async function fetchTabletIdle(slug: string): Promise<IdlePlaylistItem[]> {
  const url = `/stores/${encodeURIComponent(slug)}/tablet/idle`;
  const res = await api.get(url);
  const json = res.data;
  if (!json.success) throw new Error(json.error?.message || 'Failed to fetch idle playlist');
  return Array.isArray(json.data?.items) ? json.data.items : [];
}
