/**
 * Tablet Staff API Client — Authenticated
 *
 * WO-STORE-TABLET-REQUEST-CHANNEL-V1
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1: Interest staff management
 * WO-O4O-STORE-TABLET-LEGACY-CLEANUP-V1: Removed legacy service request functions
 *
 * Calls staff-only tablet endpoints with auth token.
 */

import { getAccessToken } from '../contexts/AuthContext';

function getStoreApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/store`;
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

// ==================== Interest Staff API ====================
// Uses /api/v1/store/interest/* (auth-based org, no slug needed)

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

export async function fetchStaffInterestRequests(): Promise<StaffInterestRequest[]> {
  const url = `${getStoreApiBase()}/interest/recent`;
  return authFetch(url);
}

export async function fetchInterestPendingCount(): Promise<{ count: number }> {
  const url = `${getStoreApiBase()}/interest/pending-count`;
  return authFetch(url);
}

export async function updateInterestAction(
  interestId: string,
  action: 'acknowledge' | 'complete' | 'cancel',
): Promise<{ id: string; status: string; updatedAt: string }> {
  const url = `${getStoreApiBase()}/interest/${interestId}/${action}`;
  return authFetch(url, { method: 'PATCH' });
}
