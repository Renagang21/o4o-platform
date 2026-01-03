/**
 * Trial API Client
 * Phase H8-FE: Trial Observation Frontend
 *
 * 기존 API만 사용 - 신규 API 생성 금지
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// ============================================================================
// Types
// ============================================================================

export interface Trial {
  id: string;
  title: string;
  description?: string;
  supplierName: string;
  rewardOptions: RewardOption[];
  status: 'draft' | 'active' | 'closed';
  currentParticipants: number;
  maxParticipants: number;
  createdAt: string;
}

export interface RewardOption {
  type: 'cash' | 'product';
  value: number | string;
  description?: string;
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
// API Functions
// ============================================================================

/**
 * GET /api/market-trial - Trial 목록 조회
 */
export async function getTrials(): Promise<Trial[]> {
  const response = await fetch(`${API_BASE_URL}/api/market-trial`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch trials: ${response.status}`);
  }

  const data = await response.json();
  return data.data || data;
}

/**
 * GET /api/market-trial/:id - Trial 상세 조회
 */
export async function getTrial(trialId: string): Promise<Trial> {
  const response = await fetch(`${API_BASE_URL}/api/market-trial/${trialId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch trial: ${response.status}`);
  }

  const data = await response.json();
  return data.data || data;
}

/**
 * POST /api/market-trial/:id/join - Trial 참여
 */
export async function joinTrial(
  trialId: string,
  rewardType: 'cash' | 'product'
): Promise<Participation> {
  const response = await fetch(`${API_BASE_URL}/api/market-trial/${trialId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ rewardType }),
  });

  if (!response.ok) {
    throw new Error(`Failed to join trial: ${response.status}`);
  }

  const data = await response.json();
  return data.data || data;
}

/**
 * POST /api/trial-shipping/:participationId - 배송 주소 등록
 */
export async function submitShippingAddress(
  participationId: string,
  address: Omit<ShippingAddress, 'participationId' | 'createdAt'>
): Promise<ShippingAddress> {
  const response = await fetch(`${API_BASE_URL}/api/trial-shipping/${participationId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(address),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit shipping address: ${response.status}`);
  }

  const data = await response.json();
  return data.data || data;
}

/**
 * GET /api/trial-shipping/:participationId - 배송 주소 조회
 */
export async function getShippingAddress(participationId: string): Promise<ShippingAddress | null> {
  const response = await fetch(`${API_BASE_URL}/api/trial-shipping/${participationId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch shipping address: ${response.status}`);
  }

  const data = await response.json();
  return data.data || data;
}

/**
 * GET /api/trial-fulfillment/:participationId - Fulfillment 상태 조회
 */
export async function getFulfillment(participationId: string): Promise<Fulfillment | null> {
  const response = await fetch(`${API_BASE_URL}/api/trial-fulfillment/${participationId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch fulfillment: ${response.status}`);
  }

  const data = await response.json();
  return data.data || data;
}
