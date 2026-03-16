/**
 * Tablet Interest Staff API Client — Authenticated
 *
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 *
 * Uses /store/interest/* endpoints (auth-based org, no slug needed).
 */

import { api } from '../lib/apiClient';

const BASE = '/store';

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

export async function fetchInterestRequests(): Promise<StaffInterestRequest[]> {
  const res = await api.get(`${BASE}/interest/recent`);
  const json = res.data;
  if (!json.success) throw new Error(json.error?.message || 'Request failed');
  return json.data;
}

export async function fetchInterestPendingCount(): Promise<{ count: number }> {
  const res = await api.get(`${BASE}/interest/pending-count`);
  const json = res.data;
  if (!json.success) throw new Error(json.error?.message || 'Request failed');
  return json.data;
}

export async function updateInterestAction(
  id: string,
  action: 'acknowledge' | 'complete' | 'cancel',
): Promise<{ id: string; status: string; updatedAt: string }> {
  const res = await api.patch(`${BASE}/interest/${id}/${action}`);
  const json = res.data;
  if (!json.success) throw new Error(json.error?.message || 'Request failed');
  return json.data;
}
