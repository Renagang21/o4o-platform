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
}

export const api = new ApiService();
