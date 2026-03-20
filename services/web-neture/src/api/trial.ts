/**
 * Trial API Client
 *
 * Phase H8-FE: Trial Observation Frontend
 * WO-O4O-MARKET-TRIAL-PHASE1-V1: Supplier create/submit + Operator approval
 */

import { api, API_BASE_URL } from '../lib/apiClient';

// ============================================================================
// Types
// ============================================================================

export type TrialStatus =
  | 'draft' | 'submitted' | 'approved' | 'recruiting'
  | 'development' | 'outcome_confirming' | 'fulfilled' | 'closed';

export interface Trial {
  id: string;
  title: string;
  description?: string;
  supplierId: string;
  supplierName?: string;
  status: TrialStatus;
  outcomeSnapshot?: {
    expectedType: 'product' | 'cash';
    description: string;
    quantity?: number;
    note?: string;
  };
  eligibleRoles?: string[];
  rewardOptions?: string[];
  visibleServiceKeys?: string[];
  maxParticipants?: number;
  currentParticipants: number;
  startDate?: string;
  endDate?: string;
  trialPeriodDays?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ServiceApproval {
  id: string;
  trialId: string;
  serviceKey: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface OperatorTrial extends Trial {
  serviceApprovals?: ServiceApproval[];
}

export interface CreateTrialPayload {
  title: string;
  description?: string;
  visibleServiceKeys: string[];
  outcomeSnapshot?: {
    expectedType: 'product' | 'cash';
    description: string;
    quantity?: number;
    note?: string;
  };
  maxParticipants?: number;
  fundingStartAt: string;
  fundingEndAt: string;
  trialPeriodDays: number;
}

export interface Participation {
  id: string;
  trialId: string;
  userId: string;
  rewardType: 'cash' | 'product';
  rewardStatus: 'pending' | 'fulfilled';
  createdAt: string;
}

export interface ShippingAddress {
  participationId: string;
  recipientName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail?: string;
  deliveryNote?: string;
  createdAt?: string;
}

export interface Fulfillment {
  participationId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed';
  orderId?: string;
  orderNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Public / Store API
// ============================================================================

export async function getTrials(): Promise<Trial[]> {
  const { data } = await api.get(`${API_BASE_URL}/api/market-trial`);
  return data.data || data;
}

export async function getTrial(trialId: string): Promise<Trial> {
  const { data } = await api.get(`${API_BASE_URL}/api/market-trial/${trialId}`);
  return data.data || data;
}

export async function joinTrial(
  trialId: string,
  rewardType: 'cash' | 'product'
): Promise<Participation> {
  const { data } = await api.post(`${API_BASE_URL}/api/market-trial/${trialId}/join`, { rewardType });
  return data.data || data;
}

// ============================================================================
// Supplier API (WO-O4O-MARKET-TRIAL-PHASE1-V1)
// ============================================================================

export async function createTrial(payload: CreateTrialPayload): Promise<Trial> {
  const { data } = await api.post(`${API_BASE_URL}/api/market-trial`, payload);
  return data.data || data;
}

export async function submitTrial(trialId: string): Promise<Trial> {
  const { data } = await api.patch(`${API_BASE_URL}/api/market-trial/${trialId}/submit`);
  return data.data || data;
}

export async function getMyTrials(): Promise<Trial[]> {
  const { data } = await api.get(`${API_BASE_URL}/api/market-trial/my`);
  return data.data || data;
}

// ============================================================================
// Neture Operator API — 1차 승인 (WO-O4O-MARKET-TRIAL-PHASE1-V1)
// ============================================================================

export async function getOperatorTrials(status?: string): Promise<OperatorTrial[]> {
  const params = status ? `?status=${status}` : '';
  const { data } = await api.get(`${API_BASE_URL}/api/v1/neture/operator/market-trial${params}`);
  return data.data || data;
}

export async function getOperatorTrialDetail(trialId: string): Promise<OperatorTrial> {
  const { data } = await api.get(`${API_BASE_URL}/api/v1/neture/operator/market-trial/${trialId}`);
  return data.data || data;
}

export async function approveTrialFirst(trialId: string): Promise<OperatorTrial> {
  const { data } = await api.patch(`${API_BASE_URL}/api/v1/neture/operator/market-trial/${trialId}/approve`);
  return data.data || data;
}

export async function rejectTrialFirst(trialId: string, reason: string): Promise<OperatorTrial> {
  const { data } = await api.patch(`${API_BASE_URL}/api/v1/neture/operator/market-trial/${trialId}/reject`, { reason });
  return data.data || data;
}

// ============================================================================
// Shipping / Fulfillment (existing)
// ============================================================================

export async function submitShippingAddress(
  participationId: string,
  address: Omit<ShippingAddress, 'participationId' | 'createdAt'>
): Promise<ShippingAddress> {
  const { data } = await api.post(`${API_BASE_URL}/api/trial-shipping/${participationId}`, address);
  return data.data || data;
}

export async function getShippingAddress(participationId: string): Promise<ShippingAddress | null> {
  try {
    const { data } = await api.get(`${API_BASE_URL}/api/trial-shipping/${participationId}`);
    return data.data || data;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number } };
    if (axiosErr.response?.status === 404) return null;
    throw err;
  }
}

export async function getFulfillment(participationId: string): Promise<Fulfillment | null> {
  try {
    const { data } = await api.get(`${API_BASE_URL}/api/trial-fulfillment/${participationId}`);
    return data.data || data;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number } };
    if (axiosErr.response?.status === 404) return null;
    throw err;
  }
}
