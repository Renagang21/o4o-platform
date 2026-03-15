/**
 * Tablet Interest Staff API Client — Authenticated
 *
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1
 *
 * Uses /api/v1/store/interest/* endpoints (auth-based org, no slug needed).
 */

import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const BASE = `${API_BASE_URL}/api/v1/store`;

export interface StaffInterestRequest {
  id: string;
  masterId: string;
  productName: string;
  customerName?: string;
  customerNote?: string;
  status: 'REQUESTED' | 'ACKNOWLEDGED';
  createdAt: string;
  acknowledgedAt?: string;
}

async function authFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const accessToken = getAccessToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...(options.headers || {}),
    },
    credentials: 'include',
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Request failed');
  return json.data;
}

export async function fetchInterestRequests(): Promise<StaffInterestRequest[]> {
  return authFetch(`${BASE}/interest/recent`);
}

export async function fetchInterestPendingCount(): Promise<{ count: number }> {
  return authFetch(`${BASE}/interest/pending-count`);
}

export async function updateInterestAction(
  id: string,
  action: 'acknowledge' | 'complete' | 'cancel',
): Promise<{ id: string; status: string; updatedAt: string }> {
  return authFetch(`${BASE}/interest/${id}/${action}`, { method: 'PATCH' });
}
