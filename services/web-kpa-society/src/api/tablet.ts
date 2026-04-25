/**
 * Tablet API Client — Public (no auth)
 *
 * WO-STORE-TABLET-REQUEST-CHANNEL-V1
 * WO-STORE-SLUG-UNIFICATION-V1: unified /api/v1/stores namespace
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1: Interest-based consultation flow
 * WO-O4O-STORE-TABLET-LEGACY-CLEANUP-V1: Removed legacy service request functions
 *
 * Calls /api/v1/stores/:slug/tablet/* endpoints directly.
 * No authentication required for tablet kiosk mode.
 */

function getApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/stores`;
}

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
  const url = `${getApiBase()}/${encodeURIComponent(slug)}/tablet/products${qs ? `?${qs}` : ''}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Failed to fetch products');
  return { data: json.data, meta: json.meta };
}

// ==================== Interest Request API ====================

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

export async function submitTabletInterest(
  slug: string,
  body: { masterId: string; customerName?: string; customerNote?: string },
): Promise<InterestSubmitResult> {
  const url = `${getApiBase()}/${encodeURIComponent(slug)}/tablet/interest`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || '관심 요청 생성에 실패했습니다.');
  return json.data;
}

export async function checkTabletInterestStatus(
  slug: string,
  interestId: string,
): Promise<InterestStatusDetail> {
  const url = `${getApiBase()}/${encodeURIComponent(slug)}/tablet/interest/${interestId}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || '요청 조회에 실패했습니다.');
  return json.data;
}

