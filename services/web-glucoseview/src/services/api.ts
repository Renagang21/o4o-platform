/**
 * GlucoseView API Service
 *
 * API client for GlucoseView backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

interface ApiResponse<T> {
  data: T;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// Customer types
export interface Customer {
  id: string;
  pharmacist_id: string;
  name: string;
  phone?: string;
  email?: string;
  age?: number;
  gender?: 'male' | 'female';
  kakao_id?: string;
  last_visit?: string;
  visit_count: number;
  sync_status: 'pending' | 'synced' | 'error';
  last_sync_at?: string;
  notes?: string;
  data_sharing_consent: boolean;
  consent_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerRequest {
  name: string;
  phone?: string;
  email?: string;
  age?: number;
  gender?: 'male' | 'female';
  kakao_id?: string;
  notes?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  phone?: string;
  email?: string;
  age?: number;
  gender?: 'male' | 'female';
  kakao_id?: string;
  notes?: string;
}

export interface CustomerStats {
  total: number;
  recentVisits: number;
  synced: number;
}

// ============================================================================
// Application Types (Phase C-4)
// ============================================================================

export type ApplicationStatus = 'submitted' | 'approved' | 'rejected';
export type ServiceType = 'cgm_view';

export interface GlucoseViewApplication {
  id: string;
  pharmacyName: string;
  businessNumber?: string;
  pharmacyId?: string;
  serviceTypes: ServiceType[];
  note?: string;
  status: ApplicationStatus;
  rejectionReason?: string;
  submittedAt: string;
  decidedAt?: string;
}

export interface AdminApplication extends GlucoseViewApplication {
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  decidedBy?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubmitApplicationRequest {
  pharmacyName: string;
  businessNumber?: string;
  pharmacyId?: string;
  note?: string;
}

export interface ReviewApplicationRequest {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface GlucoseViewPharmacy {
  id: string;
  name: string;
  businessNumber?: string;
  status: string;
  enabledServices: ServiceType[];
  glycopharmPharmacyId?: string;
  createdAt: string;
}

export interface MyPharmacyResponse {
  success: boolean;
  pharmacy: GlucoseViewPharmacy | null;
  application?: {
    id: string;
    status: ApplicationStatus;
    pharmacyName: string;
    serviceTypes: ServiceType[];
    submittedAt?: string;
    decidedAt?: string;
  };
  message?: string;
}

export interface ApplicationsResponse {
  success: boolean;
  applications: GlucoseViewApplication[];
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
  pharmacy: GlucoseViewPharmacy | null;
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
    status: string;
    enabledServices: ServiceType[];
  } | null;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as ApiError;
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Customer endpoints
  async listCustomers(params?: {
    search?: string;
    sort_by?: 'recent' | 'frequent' | 'name';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Customer>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request<PaginatedResponse<Customer>>(
      `/api/v1/glucoseview/customers${query ? `?${query}` : ''}`
    );
  }

  async getCustomer(id: string): Promise<ApiResponse<Customer>> {
    return this.request<ApiResponse<Customer>>(`/api/v1/glucoseview/customers/${id}`);
  }

  async createCustomer(data: CreateCustomerRequest): Promise<ApiResponse<Customer>> {
    return this.request<ApiResponse<Customer>>('/api/v1/glucoseview/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<ApiResponse<Customer>> {
    return this.request<ApiResponse<Customer>>(`/api/v1/glucoseview/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomer(id: string): Promise<void> {
    return this.request<void>(`/api/v1/glucoseview/customers/${id}`, {
      method: 'DELETE',
    });
  }

  async recordVisit(id: string, notes?: string): Promise<ApiResponse<Customer>> {
    return this.request<ApiResponse<Customer>>(`/api/v1/glucoseview/customers/${id}/visit`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async getCustomerStats(): Promise<ApiResponse<CustomerStats>> {
    return this.request<ApiResponse<CustomerStats>>('/api/v1/glucoseview/customers/stats');
  }

  // ============================================================================
  // Application Endpoints (Phase C-4)
  // ============================================================================

  /**
   * 서비스 신청 제출
   */
  async submitApplication(data: SubmitApplicationRequest): Promise<{ success: boolean; application: GlucoseViewApplication }> {
    return this.request('/api/v1/glucoseview/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 내 신청 목록 조회
   */
  async getMyApplications(status?: ApplicationStatus): Promise<ApplicationsResponse> {
    const params = status ? `?status=${status}` : '';
    return this.request<ApplicationsResponse>(`/api/v1/glucoseview/applications/mine${params}`);
  }

  /**
   * 내 약국 정보 조회 (승인 후)
   */
  async getMyPharmacy(): Promise<MyPharmacyResponse> {
    return this.request<MyPharmacyResponse>('/api/v1/glucoseview/pharmacies/me');
  }

  // ============================================================================
  // Admin Endpoints (Phase C-4)
  // ============================================================================

  /**
   * 모든 신청 목록 조회 (운영자 전용)
   */
  async getAdminApplications(params?: {
    status?: ApplicationStatus;
    page?: number;
    limit?: number;
  }): Promise<AdminApplicationsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    return this.request<AdminApplicationsResponse>(
      `/api/v1/glucoseview/applications/admin/all${queryString ? `?${queryString}` : ''}`
    );
  }

  /**
   * 신청 상세 조회 (운영자 전용)
   */
  async getAdminApplicationDetail(id: string): Promise<AdminApplicationDetailResponse> {
    return this.request<AdminApplicationDetailResponse>(`/api/v1/glucoseview/applications/${id}/admin`);
  }

  /**
   * 신청 승인/반려 (운영자 전용)
   */
  async reviewApplication(id: string, data: ReviewApplicationRequest): Promise<ReviewApplicationResponse> {
    return this.request<ReviewApplicationResponse>(`/api/v1/glucoseview/applications/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiService();
