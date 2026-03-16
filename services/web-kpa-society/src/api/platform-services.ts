/**
 * Platform Services API Client
 *
 * 플랫폼 서비스 카탈로그 조회.
 * 경로: /api/v1/platform-services (KPA namespace 밖)
 *
 * WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1
 * WO-O4O-USER-DOMAIN-CLEANUP-V1: enrollment 제거 → service_memberships 기반
 */

import { getAccessToken } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/platform-services`
  : '/api/v1/platform-services';

interface PlatformServiceItem {
  id: string;
  code: string;
  name: string;
  shortDescription: string | null;
  entryUrl: string | null;
  serviceType: 'community' | 'tool' | 'extension';
  approvalRequired: boolean;
  isFeatured: boolean;
  featuredOrder: number;
  status: 'active' | 'hidden';
  iconEmoji: string | null;
  /** Membership status from service_memberships (mapped: active→approved, pending→applied) */
  enrollmentStatus?: 'applied' | 'approved' | 'rejected';
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  code?: string;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
    credentials: 'include',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || err.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/** 가시 서비스 목록 (로그인 시 membership status 포함) */
export async function listPlatformServices(): Promise<PlatformServiceItem[]> {
  const res = await fetchApi<PlatformServiceItem[]>('');
  return res.data || [];
}

export type { PlatformServiceItem };
