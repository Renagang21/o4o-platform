/**
 * Tablet API Client — Public (no auth)
 *
 * WO-STORE-TABLET-REQUEST-CHANNEL-V1
 *
 * Calls /api/v1/glycopharm/stores/:slug/tablet/* endpoints directly.
 * No authentication required for tablet kiosk mode.
 */

const GLYCOPHARM_API = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/glycopharm`
  : '/api/v1/glycopharm';

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

export interface TabletRequestResult {
  requestId: string;
  status: string;
  createdAt: string;
}

export interface TabletRequestDetail {
  id: string;
  status: 'requested' | 'acknowledged' | 'served' | 'cancelled';
  items: Array<{ productId: string; quantity: number; productName: string; price: number }>;
  note?: string;
  customerName?: string;
  createdAt: string;
  acknowledgedAt?: string;
  servedAt?: string;
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
  const url = `${GLYCOPHARM_API}/stores/${encodeURIComponent(slug)}/tablet/products${qs ? `?${qs}` : ''}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Failed to fetch products');
  return { data: json.data, meta: json.meta };
}

export async function submitTabletRequest(
  slug: string,
  body: { items: Array<{ productId: string; quantity: number }>; note?: string; customerName?: string },
): Promise<TabletRequestResult> {
  const url = `${GLYCOPHARM_API}/stores/${encodeURIComponent(slug)}/tablet/requests`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || '요청 생성에 실패했습니다.');
  return json.data;
}

export async function checkTabletRequestStatus(
  slug: string,
  requestId: string,
): Promise<TabletRequestDetail> {
  const url = `${GLYCOPHARM_API}/stores/${encodeURIComponent(slug)}/tablet/requests/${requestId}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || '요청 조회에 실패했습니다.');
  return json.data;
}
