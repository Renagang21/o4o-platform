/**
 * Market Trial API Client
 *
 * WO-MARKET-TRIAL-SERVICE-ENTRY-BANNER-AND-GATEWAY-V1
 * WO-MARKET-TRIAL-KPA-TRIAL-HUB-REFINE-V1
 * WO-MARKET-TRIAL-KPA-DETAIL-AND-FORUM-DEEP-LINK-V1
 *
 * Market Trial API는 /api/market-trial에 마운트되어 있어
 * KPA apiClient(/api/v1/kpa prefix)와 호환되지 않음.
 * VITE_API_BASE_URL을 직접 사용하여 호출.
 */

import { getAccessToken } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface TrialSummary {
  id: string;
  title: string;
  description: string | null;
  status: string;
  supplierId: string;
  supplierName?: string;
  eligibleRoles: string[];
  rewardOptions: string[];
  outcomeSnapshot?: {
    expectedType: 'product' | 'cash';
    description: string;
    quantity?: number;
    note?: string;
  };
  currentParticipants: number;
  maxParticipants?: number;
  startDate?: string;
  endDate?: string;
  visibleServiceKeys: string[];
  forumPostId?: string;
  createdAt: string;
}

/**
 * 공개 Trial 목록 조회 (status 필터 선택적)
 * 기본: pre-launch(draft/submitted/approved) 제외한 전체
 */
export async function getTrials(params?: { status?: string }): Promise<{ success: boolean; data: TrialSummary[] }> {
  const token = getAccessToken();
  const query = params?.status ? `?status=${params.status}` : '';
  const res = await fetch(`${API_BASE}/api/market-trial${query}`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  return res.json();
}

// ── Gateway ──

export interface GatewayTrialSummary {
  id: string;
  title: string;
  status: string;
  supplierName?: string;
  currentParticipants: number;
  maxParticipants?: number;
  fundingEndAt?: string;
}

export type AccessStatus =
  | 'not_logged_in'
  | 'no_kpa_membership'
  | 'not_pharmacy_member'
  | 'pending_approval'
  | 'no_trials'
  | 'accessible';

export interface GatewayResponse {
  success: boolean;
  data: {
    accessStatus: AccessStatus;
    openTrialCount: number;
    trials: GatewayTrialSummary[];
  };
}

export async function getGateway(serviceKey?: string): Promise<GatewayResponse> {
  const token = getAccessToken();
  const params = serviceKey ? `?serviceKey=${serviceKey}` : '';
  const res = await fetch(`${API_BASE}/api/market-trial/gateway${params}`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  return res.json();
}

// ── Detail ──

/**
 * Trial 개별 상세 조회
 * WO-MARKET-TRIAL-KPA-DETAIL-AND-FORUM-DEEP-LINK-V1
 */
export async function getTrialDetail(id: string): Promise<{ success: boolean; data: TrialSummary }> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}/api/market-trial/${id}`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  return res.json();
}

// ── Participation ──

export interface ParticipationInfo {
  id: string;
  trialId: string;
  participantId: string;
  role: string;
  rewardType: 'cash' | 'product';
  rewardStatus: 'pending' | 'fulfilled';
  joinedAt: string;
}

/**
 * 현재 사용자의 참여 정보 조회
 * WO-MARKET-TRIAL-PARTICIPATION-REQUEST-UI-V1
 */
export async function getParticipation(
  trialId: string,
): Promise<{ success: boolean; data: ParticipationInfo | null }> {
  const token = getAccessToken();
  if (!token) return { success: true, data: null };
  const res = await fetch(`${API_BASE}/api/market-trial/${trialId}/participation`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

/**
 * Trial 참여 신청
 * WO-MARKET-TRIAL-PARTICIPATION-REQUEST-UI-V1
 */
export async function joinTrial(
  trialId: string,
  rewardType: 'cash' | 'product',
): Promise<{ success: boolean; data?: ParticipationInfo; message?: string }> {
  const token = getAccessToken();
  if (!token) return { success: false, message: '로그인이 필요합니다.' };
  const res = await fetch(`${API_BASE}/api/market-trial/${trialId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rewardType }),
  });
  return res.json();
}
