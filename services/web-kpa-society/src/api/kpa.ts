/**
 * KPA API Client
 * Phase 2-E: KPA Society Frontend Integration
 *
 * API 엔드포인트:
 * - Organizations: /api/v1/organizations
 * - Role Applications: /api/v2/roles (회원 신청)
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// ============================================================================
// Types
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  code: string;
  type: 'headquarters' | 'branch' | 'chapter';
  parentId?: string;
  description?: string;
  isActive: boolean;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationListResponse {
  success: boolean;
  data: Organization[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface OrganizationDetailResponse {
  success: boolean;
  data: Organization & {
    parent?: Organization;
    children?: Organization[];
  };
}

export interface RoleApplication {
  id: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  businessName?: string;
  businessNumber?: string;
  note?: string;
  appliedAt: string;
  decidedAt?: string;
  decidedBy?: string;
}

export interface ApplyRoleRequest {
  role: string;
  businessName?: string;
  businessNumber?: string;
  note?: string;
}

export interface ApplyRoleResponse {
  success: boolean;
  message: string;
  application: RoleApplication;
}

export interface MyApplicationsResponse {
  success: boolean;
  applications: RoleApplication[];
}

export interface ApiError {
  error: string;
  code: string;
  message?: string;
}

// ============================================================================
// API Client
// ============================================================================

class KpaApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // For cookie-based auth
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        error: errorData.error || 'Request failed',
        code: errorData.code || 'UNKNOWN_ERROR',
        message: errorData.message,
      };
    }

    return response.json();
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async checkHealth(): Promise<{ status: string }> {
    return this.request('/health');
  }

  // ============================================================================
  // Organizations API
  // ============================================================================

  async listOrganizations(params?: {
    type?: 'headquarters' | 'branch' | 'chapter';
    parentId?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<OrganizationListResponse> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/v1/organizations${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async getOrganization(
    id: string,
    options?: {
      includeParent?: boolean;
      includeChildren?: boolean;
      includeMemberCount?: boolean;
    }
  ): Promise<OrganizationDetailResponse> {
    const searchParams = new URLSearchParams();

    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/v1/organizations/${id}${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async getOrganizationTree(): Promise<{ success: boolean; data: Organization[] }> {
    return this.request('/api/v1/organizations/tree');
  }

  // ============================================================================
  // Role Applications API (Member Applications)
  // ============================================================================

  async applyForRole(data: ApplyRoleRequest): Promise<ApplyRoleResponse> {
    return this.request('/api/v2/roles/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyApplications(status?: 'pending' | 'approved' | 'rejected'): Promise<MyApplicationsResponse> {
    const endpoint = status
      ? `/api/v2/roles/applications/my?status=${status}`
      : '/api/v2/roles/applications/my';

    return this.request(endpoint);
  }
}

// Export singleton instance
export const kpaApi = new KpaApiClient(API_BASE_URL);

// Also export the class for testing
export { KpaApiClient };
