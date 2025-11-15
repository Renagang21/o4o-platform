import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  MeResponse,
  EnrollmentCreateData,
  Enrollment,
  EnrollmentListResponse
} from './types.js';

interface RefreshResponse {
  success: boolean;
  message: string;
}

export class CookieAuthClient {
  private baseURL: string;
  public api: AxiosInstance;
  private refreshPromise: Promise<boolean> | null = null;
  private currentToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Important for cookies
    }) as any;

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response: any) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // If already refreshing, wait for it
          if (this.refreshPromise) {
            const success = await this.refreshPromise;
            if (success) {
              return this.api.request(originalRequest);
            }
            throw error;
          }

          // Start refresh
          this.refreshPromise = this.refreshToken();
          const success = await this.refreshPromise;
          this.refreshPromise = null;

          if (success) {
            return this.api.request(originalRequest);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post('/auth/v2/login', credentials);
    // Store token if returned (for WebSocket auth)
    if (response.data.token) {
      this.currentToken = response.data.token;
    }
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.api.post('/auth/v2/register', data);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/v2/logout');
    } catch (error) {
      // Even if logout fails, we should clear local state
    } finally {
      this.currentToken = null;
    }
  }

  async logoutAll(): Promise<void> {
    await this.api.post('/auth/v2/logout-all');
    this.currentToken = null;
  }

  async refreshToken(): Promise<boolean> {
    try {
      const response = await this.api.post<RefreshResponse>('/auth/v2/refresh');
      return response.data.success;
    } catch (error) {
      return false;
    }
  }

  async getCurrentUser(): Promise<MeResponse | null> {
    try {
      const response = await this.api.get('/auth/cookie/me');
      return response.data;
    } catch (error) {
      return null;
    }
  }
  
  getApiUrl(): string {
    return this.baseURL;
  }
  
  getAccessToken(): string | null {
    return this.currentToken;
  }

  // Cross-tab communication for session sync
  setupSessionSync(): void {
    if (typeof window === 'undefined') return;

    // Listen for storage events from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === 'auth-logout') {
        // Another tab logged out, we should too
        window.location.reload();
      } else if (event.key === 'auth-login') {
        // Another tab logged in, refresh our session
        this.refreshToken();
      }
    });
  }

  // Notify other tabs about auth changes
  private broadcastAuthChange(type: 'login' | 'logout'): void {
    if (typeof window === 'undefined') return;
    
    // Use localStorage to trigger storage event in other tabs
    const key = `auth-${type}`;
    localStorage.setItem(key, Date.now().toString());
    
    // Clean up after a moment
    setTimeout(() => localStorage.removeItem(key), 100);
  }

  // Enhanced login with session sync
  async loginWithSync(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.login(credentials);
    this.broadcastAuthChange('login');
    return response;
  }

  // Enhanced logout with session sync
  async logoutWithSync(): Promise<void> {
    await this.logout();
    this.broadcastAuthChange('logout');
  }

  // ============================================================================
  // P0 RBAC: Enrollment API Methods
  // ============================================================================

  /**
   * Create a new role enrollment application
   * POST /enrollments
   */
  async createEnrollment(data: EnrollmentCreateData): Promise<Enrollment> {
    const response = await this.api.post('/enrollments', data);
    return response.data.enrollment;
  }

  /**
   * Get current user's enrollment history
   * GET /enrollments/my
   */
  async getMyEnrollments(): Promise<Enrollment[]> {
    const response = await this.api.get('/enrollments/my');
    return response.data.enrollments;
  }

  // ============================================================================
  // P0 RBAC: Admin Enrollment Review API Methods
  // ============================================================================

  /**
   * Get all enrollments (admin only)
   * GET /admin/enrollments
   */
  async getAdminEnrollments(params?: {
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<EnrollmentListResponse> {
    const response = await this.api.get('/admin/enrollments', { params });
    return response.data;
  }

  /**
   * Approve an enrollment (admin only)
   * PATCH /admin/enrollments/:id/approve
   */
  async approveEnrollment(id: string, notes?: string): Promise<void> {
    await this.api.patch(`/admin/enrollments/${id}/approve`, { notes });
  }

  /**
   * Reject an enrollment (admin only)
   * PATCH /admin/enrollments/:id/reject
   */
  async rejectEnrollment(id: string, reason: string): Promise<void> {
    await this.api.patch(`/admin/enrollments/${id}/reject`, { reason });
  }

  /**
   * Put an enrollment on hold (admin only)
   * PATCH /admin/enrollments/:id/hold
   */
  async holdEnrollment(id: string, reason: string, requiredFields?: string[]): Promise<void> {
    await this.api.patch(`/admin/enrollments/${id}/hold`, {
      reason,
      required_fields: requiredFields
    });
  }
}

// Helper function to get API URL
function getApiUrl(): string {
  // Browser environment
  if (typeof window !== 'undefined') {
    // Check for environment variable (Vite)
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }

    // Localhost development
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:4000/api/v1';
    }
  }

  // Production default
  return 'https://api.neture.co.kr/api/v1';
}

// Export singleton instance
export const cookieAuthClient = new CookieAuthClient(getApiUrl());

// Auto-setup session sync
if (typeof window !== 'undefined') {
  cookieAuthClient.setupSessionSync();
}