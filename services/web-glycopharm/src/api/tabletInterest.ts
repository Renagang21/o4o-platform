/**
 * Tablet Interest Staff API Client — Authenticated
 *
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 auto-refresh
 *
 * Uses /api/v1/store/interest/* endpoints (auth-based org, no slug needed).
 */

import { api } from '@/lib/apiClient';

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
  const res = await api.get('/store/interest/recent');
  return res.data?.data;
}

export async function fetchInterestPendingCount(): Promise<{ count: number }> {
  const res = await api.get('/store/interest/pending-count');
  return res.data?.data;
}

export async function updateInterestAction(
  id: string,
  action: 'acknowledge' | 'complete' | 'cancel',
): Promise<{ id: string; status: string; updatedAt: string }> {
  const res = await api.patch(`/store/interest/${id}/${action}`);
  return res.data?.data;
}
