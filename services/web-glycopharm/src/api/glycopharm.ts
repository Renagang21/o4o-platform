/**
 * GlycoPharm API Client
 * glycopharm-web API 연동 (Alpha v1)
 *
 * API 엔드포인트:
 * - Applications: /api/v1/glycopharm/applications (참여/서비스 신청)
 * - Pharmacies: /api/v1/glycopharm/pharmacies (약국 정보)
 */

import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// ============================================================================
// Types
// ============================================================================

export type ServiceType = 'dropshipping' | 'sample_sales' | 'digital_signage';
export type ApplicationStatus = 'submitted' | 'approved' | 'rejected';
export type OrganizationType = 'pharmacy' | 'pharmacy_chain';

export interface GlycopharmApplication {
  id: string;
  userId: string;
  organizationType: OrganizationType;
  organizationName: string;
  businessNumber?: string;
  serviceTypes: ServiceType[];
  status: ApplicationStatus;
  note?: string;
  submittedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  rejectionReason?: string;
}

export interface SubmitApplicationRequest {
  organizationType: OrganizationType;
  organizationName: string;
  businessNumber?: string;
  serviceTypes: ServiceType[];
  note?: string;
}

export interface SubmitApplicationResponse {
  success: boolean;
  message: string;
  application: GlycopharmApplication;
}

export interface MyApplicationsResponse {
  success: boolean;
  applications: GlycopharmApplication[];
}

export interface PharmacyInfo {
  id: string;
  name: string;
  businessNumber: string;
  address?: string;
  phone?: string;
  activeServices: ServiceType[];
  joinedAt: string;
}

export interface MyPharmacyResponse {
  success: boolean;
  data: PharmacyInfo | null;
}

export interface ApiError {
  status: number;
  error: string;
  code: string;
  message?: string;
}

// ============================================================================
// Admin Types (운영 API)
// ============================================================================

export interface AdminApplication extends GlycopharmApplication {
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminApplicationsResponse {
  success: boolean;
  applications: AdminApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminApplicationDetailResponse {
  success: boolean;
  application: AdminApplication;
  pharmacy: {
    id: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
    email?: string;
    ownerName?: string;
    businessNumber?: string;
    status: string;
    createdAt: string;
  } | null;
}

export interface ReviewApplicationRequest {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface ReviewApplicationResponse {
  success: boolean;
  message: string;
  application: {
    id: string;
    status: ApplicationStatus;
    decidedAt: string;
    decidedBy: string;
    rejectionReason?: string;
  };
  pharmacy: {
    id: string;
    name: string;
    code: string;
    status: string;
  } | null;
}

// ============================================================================
// API Client
// ============================================================================

class GlycopharmApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Cross-domain: Bearer Token 인증 (localStorage에서 토큰 가져옴)
    const accessToken = getAccessToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      ...options.headers,
    };

    // credentials: 'include'는 같은 도메인에서만 쿠키를 전송 (폴백)
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        status: response.status,
        error: errorData.error || 'Request failed',
        code: errorData.code || 'UNKNOWN_ERROR',
        message: errorData.message,
      };
      throw error;
    }

    return response.json();
  }

  // ============================================================================
  // Applications API (참여/서비스 신청)
  // ============================================================================

  /**
   * 약국 참여 / 서비스 신청
   */
  async submitApplication(data: SubmitApplicationRequest): Promise<SubmitApplicationResponse> {
    return this.request('/api/v1/glycopharm/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 내 신청 목록 조회
   */
  async getMyApplications(status?: ApplicationStatus): Promise<MyApplicationsResponse> {
    const endpoint = status
      ? `/api/v1/glycopharm/applications/mine?status=${status}`
      : '/api/v1/glycopharm/applications/mine';

    return this.request(endpoint);
  }

  /**
   * 신청 상세 조회
   */
  async getApplication(id: string): Promise<{ success: boolean; application: GlycopharmApplication }> {
    return this.request(`/api/v1/glycopharm/applications/${id}`);
  }

  // ============================================================================
  // Pharmacies API (약국 정보)
  // ============================================================================

  /**
   * 내 약국 정보 조회 (참여 후)
   */
  async getMyPharmacy(): Promise<MyPharmacyResponse> {
    return this.request('/api/v1/glycopharm/pharmacies/me');
  }

  // ============================================================================
  // Admin API (운영자 전용)
  // ============================================================================

  /**
   * 모든 신청 목록 조회 (운영자 전용)
   */
  async getAdminApplications(params?: {
    status?: ApplicationStatus;
    serviceType?: ServiceType;
    organizationType?: OrganizationType;
    page?: number;
    limit?: number;
  }): Promise<AdminApplicationsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.serviceType) searchParams.set('serviceType', params.serviceType);
    if (params?.organizationType) searchParams.set('organizationType', params.organizationType);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const endpoint = `/api/v1/glycopharm/applications/admin/all${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  /**
   * 신청 상세 조회 (운영자 전용)
   */
  async getAdminApplicationDetail(id: string): Promise<AdminApplicationDetailResponse> {
    return this.request(`/api/v1/glycopharm/applications/${id}/admin`);
  }

  /**
   * 신청 승인/반려 (운영자 전용)
   */
  async reviewApplication(id: string, data: ReviewApplicationRequest): Promise<ReviewApplicationResponse> {
    return this.request(`/api/v1/glycopharm/applications/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

// Export singleton instance
export const glycopharmApi = new GlycopharmApiClient(API_BASE_URL);

// Also export the class for testing
export { GlycopharmApiClient };
