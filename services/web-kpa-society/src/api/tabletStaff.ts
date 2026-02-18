/**
 * Tablet Staff API Client — Authenticated
 *
 * WO-STORE-TABLET-REQUEST-CHANNEL-V1
 * WO-KPA-STORE-CHANNEL-INTEGRATION-V1: service parameter for KPA reuse
 *
 * Calls staff-only tablet endpoints with auth token.
 */

import { getAccessToken } from '../contexts/AuthContext';

function getApiBase(service: string = 'glycopharm'): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/${service}`;
}

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

export async function fetchStaffTabletRequests(slug: string, service?: string): Promise<StaffTabletRequest[]> {
  const url = `${getApiBase(service)}/stores/${encodeURIComponent(slug)}/tablet/staff/requests`;
  return authFetch(url);
}

export async function updateTabletRequestAction(
  slug: string,
  requestId: string,
  action: 'acknowledge' | 'serve' | 'cancel',
  service?: string,
): Promise<{ id: string; status: string; updatedAt: string }> {
  const url = `${getApiBase(service)}/stores/${encodeURIComponent(slug)}/tablet/staff/requests/${requestId}`;
  return authFetch(url, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
}
