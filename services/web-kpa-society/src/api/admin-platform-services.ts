/**
 * Admin Platform Services API Client
 *
 * 운영자용 서비스 카탈로그 관리 및 신청 승인/반려.
 * 경로: /api/v1/admin/platform-services
 *
 * WO-ADMIN-SERVICE-ENROLLMENT-APPROVAL-V1
 */

import { getAccessToken } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/admin/platform-services`
  : '/api/v1/admin/platform-services';

interface AdminServiceItem {
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
}

interface EnrollmentItem {
  id: string;
  userId: string;
  serviceCode: string;
  status: 'not_applied' | 'applied' | 'approved' | 'rejected';
  appliedAt: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string };
  service?: AdminServiceItem;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

async function fetchAdminApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
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

/** 전체 서비스 목록 (admin) */
export async function listAdminServices(): Promise<AdminServiceItem[]> {
  const res = await fetchAdminApi<AdminServiceItem[]>('');
  return res.data || [];
}

/** 서비스별 신청 목록 */
export async function listEnrollments(
  serviceCode: string,
  status?: 'applied' | 'approved' | 'rejected',
): Promise<EnrollmentItem[]> {
  const query = status ? `?status=${status}` : '';
  const res = await fetchAdminApi<EnrollmentItem[]>(`/${serviceCode}/enrollments${query}`);
  return res.data || [];
}

/** 신청 승인/반려 */
export async function reviewEnrollment(
  id: string,
  status: 'approved' | 'rejected',
  note?: string,
): Promise<EnrollmentItem> {
  const res = await fetchAdminApi<EnrollmentItem>(`/enrollments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });
  return res.data;
}

export type { AdminServiceItem, EnrollmentItem };
