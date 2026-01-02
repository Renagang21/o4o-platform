/**
 * Service Applications Admin API Client
 *
 * 서비스 신청 관리 통합 API (glycopharm, glucoseview)
 *
 * API 경로:
 * - Glycopharm: /api/v1/glycopharm/applications/*
 * - GlucoseView: /api/v1/glucoseview/applications/*
 */

import { authClient } from '@o4o/auth-client';

const api = authClient.api;

// ==================== Types ====================

export type ServiceType = 'glycopharm' | 'glucoseview';

export type ApplicationStatus = 'submitted' | 'approved' | 'rejected';

export type GlycopharmServiceType = 'nps' | 'erp_integration';
export type GlucoseViewServiceType = 'cgm_view';

export interface ServiceApplication {
  id: string;
  userId: string;
  pharmacyId?: string;
  pharmacyName: string;
  businessNumber?: string;
  serviceTypes: string[];
  status: ApplicationStatus;
  note?: string;
  rejectionReason?: string;
  submittedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  createdAt: string;
  updatedAt: string;
  // Admin view fields
  userName?: string;
  userEmail?: string;
}

export interface ApplicationFilters {
  status?: ApplicationStatus;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApplicationsResponse {
  success: boolean;
  applications: ServiceApplication[];
  pagination: PaginationMeta;
}

export interface ApplicationDetailResponse {
  success: boolean;
  application: ServiceApplication;
}

export interface ReviewApplicationRequest {
  action: 'approve' | 'reject';
  rejectionReason?: string;
}

export interface ReviewApplicationResponse {
  success: boolean;
  application: ServiceApplication;
  pharmacy?: {
    id: string;
    name: string;
    enabledServices: string[];
  };
  message?: string;
}

// ==================== Helper Functions ====================

function getApiBasePath(service: ServiceType): string {
  switch (service) {
    case 'glycopharm':
      return '/api/v1/glycopharm/applications';
    case 'glucoseview':
      return '/api/v1/glucoseview/applications';
    default:
      throw new Error(`Unknown service type: ${service}`);
  }
}

// ==================== API Functions ====================

/**
 * 관리자용 신청 목록 조회
 */
export async function getApplications(
  service: ServiceType,
  filters: ApplicationFilters = {}
): Promise<ApplicationsResponse> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const queryString = params.toString();
  const basePath = getApiBasePath(service);
  const url = `${basePath}/admin/all${queryString ? `?${queryString}` : ''}`;

  const response = await api.get<ApplicationsResponse>(url);
  return response.data;
}

/**
 * 관리자용 신청 상세 조회
 */
export async function getApplicationDetail(
  service: ServiceType,
  id: string
): Promise<ApplicationDetailResponse> {
  const basePath = getApiBasePath(service);
  const url = `${basePath}/${id}/admin`;

  const response = await api.get<ApplicationDetailResponse>(url);
  return response.data;
}

/**
 * 신청 심사 (승인/반려)
 */
export async function reviewApplication(
  service: ServiceType,
  id: string,
  data: ReviewApplicationRequest
): Promise<ReviewApplicationResponse> {
  const basePath = getApiBasePath(service);
  const url = `${basePath}/${id}/review`;

  const response = await api.patch<ReviewApplicationResponse>(url, data);
  return response.data;
}

// ==================== Status Labels & Colors ====================

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: '심사 대기',
  approved: '승인됨',
  rejected: '반려됨',
};

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, { bg: string; text: string }> = {
  submitted: { bg: 'bg-amber-100', text: 'text-amber-700' },
  approved: { bg: 'bg-green-100', text: 'text-green-700' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700' },
};

// ==================== Service Labels ====================

export const SERVICE_LABELS: Record<ServiceType, string> = {
  glycopharm: 'GlycoPharm',
  glucoseview: 'GlucoseView',
};

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  // Glycopharm
  nps: 'NPS 서비스',
  erp_integration: 'ERP 연동',
  // GlucoseView
  cgm_view: 'CGM View',
};

export function getServiceTypeLabel(serviceType: string): string {
  return SERVICE_TYPE_LABELS[serviceType] || serviceType;
}
