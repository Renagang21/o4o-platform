/**
 * GlucoseView API Service
 *
 * API client for GlucoseView backend
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반으로 전환
 */

import { api as axiosApi } from '../lib/apiClient';

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

// Care Analysis types

export interface BpAnalysisResult {
  avgSystolic: number;
  avgDiastolic: number;
  bpCategory: 'normal' | 'elevated' | 'high_stage1' | 'high_stage2';
  readingCount: number;
}

export interface WeightAnalysisResult {
  latestWeight: number;
  weightChange: number | null;
  bmi: number | null;
  readingCount: number;
}

export interface MetabolicRiskResult {
  metabolicRiskLevel: 'low' | 'moderate' | 'high';
  metabolicScore: number;
  riskFactors: string[];
}

export interface MultiMetricData {
  bp: BpAnalysisResult | null;
  weight: WeightAnalysisResult | null;
  metabolicRisk: MetabolicRiskResult;
}

// WO-O4O-CARE-LLM-INSIGHT-V1
export interface CareLlmInsightDto {
  pharmacyInsight: string | null;
  patientMessage: string | null;
  model: string | null;
  createdAt: string | null;
}

export interface CareInsightDto {
  patientId: string;
  tir: number;
  cv: number;
  riskLevel: 'low' | 'moderate' | 'high';
  insights: string[];
  multiMetric?: MultiMetricData;
}

export interface KpiComparisonDto {
  latestTir: number | null;
  previousTir: number | null;
  tirChange: number | null;
  latestCv: number | null;
  previousCv: number | null;
  cvChange: number | null;
  riskTrend: 'improving' | 'stable' | 'worsening' | null;
}

export interface CareDashboardDto {
  totalPatients: number;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
  recentCoachingCount: number;
  improvingCount: number;
  recentSnapshots: Array<{ patientId: string; riskLevel: string; createdAt: string }>;
  recentSessions: Array<{ patientId: string; summary: string; createdAt: string }>;
}

export interface CoachingSession {
  id: string;
  patientId: string;
  pharmacistId: string;
  snapshotId: string | null;
  summary: string;
  actionPlan: string;
  createdAt: string;
}

export interface CreateCoachingSessionRequest {
  patientId: string;
  pharmacistId: string;
  snapshotId?: string;
  summary: string;
  actionPlan: string;
}

// Health Reading types (WO-O4O-HEALTH-DATA-PIPELINE-V1)
export interface HealthReadingDto {
  id: string;
  patientId: string;
  metricType: string;
  valueNumeric: string | null;
  valueText: string | null;
  unit: string;
  measuredAt: string;
  sourceType: string;
  createdBy: string | null;
  metadata: Record<string, unknown>;
  pharmacyId: string;
  createdAt: string;
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
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Strip /api/v1 prefix — authClient baseURL already includes it
    const path = endpoint.replace(/^\/api\/v1/, '');
    const method = (options.method || 'GET').toUpperCase();
    const parsedBody = options.body ? JSON.parse(options.body as string) : undefined;

    try {
      let response;
      switch (method) {
        case 'POST':
          response = await axiosApi.post(path, parsedBody);
          break;
        case 'PUT':
          response = await axiosApi.put(path, parsedBody);
          break;
        case 'PATCH':
          response = await axiosApi.patch(path, parsedBody);
          break;
        case 'DELETE':
          response = await axiosApi.delete(path);
          break;
        default:
          response = await axiosApi.get(path);
          break;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return response.data as T;
    } catch (err: any) {
      const errorData = err.response?.data as ApiError | undefined;
      throw new Error(
        errorData?.error?.message || `HTTP ${err.response?.status || 'unknown'}`
      );
    }
  }

  // Care Analysis endpoints (WO-CARE-ANALYSIS-PROVIDER-V1)
  async getCareAnalysis(patientId: string): Promise<CareInsightDto> {
    return this.request<CareInsightDto>(`/api/v1/care/analysis/${patientId}`);
  }

  // Care KPI endpoints (WO-CARE-KPI-SNAPSHOT-V1)
  async getCareKpi(patientId: string): Promise<KpiComparisonDto> {
    return this.request<KpiComparisonDto>(`/api/v1/care/kpi/${patientId}`);
  }

  // Care LLM Insight (WO-O4O-CARE-LLM-INSIGHT-V1)
  async getCareLlmInsight(patientId: string): Promise<CareLlmInsightDto> {
    return this.request<CareLlmInsightDto>(`/api/v1/care/llm-insight/${patientId}`);
  }

  // Care Coaching endpoints (WO-CARE-COACHING-ENGINE-V1)
  async createCoachingSession(data: CreateCoachingSessionRequest): Promise<CoachingSession> {
    return this.request<CoachingSession>('/api/v1/care/coaching', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCoachingSessions(patientId: string): Promise<CoachingSession[]> {
    return this.request<CoachingSession[]>(`/api/v1/care/coaching/${patientId}`);
  }

  // Care Dashboard endpoint (WO-CARE-DASHBOARD-INTEGRATION-V1)
  async getCareDashboard(): Promise<CareDashboardDto> {
    return this.request<CareDashboardDto>('/api/v1/care/dashboard');
  }

  // Health Readings (WO-O4O-HEALTH-DATA-PIPELINE-V1)
  async getHealthReadings(
    patientId: string,
    params?: { from?: string; to?: string; metricType?: string }
  ): Promise<HealthReadingDto[]> {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    if (params?.metricType) searchParams.set('metricType', params.metricType);
    const query = searchParams.toString();
    return this.request<HealthReadingDto[]>(
      `/api/v1/care/health-readings/${patientId}${query ? `?${query}` : ''}`
    );
  }

  async postHealthReading(data: {
    patientId: string;
    metricType?: string;
    valueNumeric: number;
    unit?: string;
    measuredAt: string;
  }): Promise<HealthReadingDto> {
    return this.request<HealthReadingDto>('/api/v1/care/health-readings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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

  /**
   * AI 질의 — Backend Proxy 경유
   */
  async aiQuery(userPrompt: string, systemPrompt?: string): Promise<string> {
    const data = await this.request<{ success: boolean; answer?: string }>('/api/ai/query', {
      method: 'POST',
      body: JSON.stringify({ question: userPrompt, systemPrompt }),
    });
    return data.answer || '';
  }
}

export const api = new ApiService();

