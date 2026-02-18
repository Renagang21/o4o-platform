/**
 * Tablet Staff API Client — Authenticated
 *
 * WO-STORE-TABLET-REQUEST-CHANNEL-V1
 *
 * Calls staff-only tablet endpoints with auth token.
 */

import { getAccessToken } from '../contexts/AuthContext';

const GLYCOPHARM_API = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/glycopharm`
  : '/api/v1/glycopharm';

export interface StaffTabletRequest {
  id: string;
  items: Array<{ productId: string; quantity: number; productName: string; price: number }>;
  note?: string;
  customerName?: string;
  status: 'requested' | 'acknowledged';
  createdAt: string;
  acknowledgedAt?: string;
}

async function authFetch(url: string, options: RequestInit = {}): Promise<any> {
  const token = getAccessToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Request failed');
  return json.data;
}

export async function fetchStaffTabletRequests(slug: string): Promise<StaffTabletRequest[]> {
  const url = `${GLYCOPHARM_API}/stores/${encodeURIComponent(slug)}/tablet/staff/requests`;
  return authFetch(url);
}

export async function updateTabletRequestAction(
  slug: string,
  requestId: string,
  action: 'acknowledge' | 'serve' | 'cancel',
): Promise<{ id: string; status: string; updatedAt: string }> {
  const url = `${GLYCOPHARM_API}/stores/${encodeURIComponent(slug)}/tablet/staff/requests/${requestId}`;
  return authFetch(url, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
}
