import { AxiosInstance } from 'axios';
import type { LoginCredentials, RegisterData, AuthResponse, MeResponse, EnrollmentCreateData, Enrollment, EnrollmentListResponse } from './types.js';
export declare class CookieAuthClient {
    private baseURL;
    api: AxiosInstance;
    private refreshPromise;
    private currentToken;
    private hasHandledSessionExpiry;
    constructor(baseURL: string);
    login(credentials: LoginCredentials): Promise<AuthResponse>;
    register(data: RegisterData): Promise<AuthResponse>;
    logout(): Promise<void>;
    logoutAll(): Promise<void>;
    refreshToken(): Promise<boolean>;
    /**
     * Handle session expiry by broadcasting event
     * Only happens once per session to avoid spam
     */
    private handleSessionExpiry;
    /**
     * Reset session expiry flag (called after successful login)
     */
    resetSessionExpiryFlag(): void;
    getCurrentUser(): Promise<MeResponse | null>;
    getApiUrl(): string;
    getAccessToken(): string | null;
    setupSessionSync(): void;
    private broadcastAuthChange;
    loginWithSync(credentials: LoginCredentials): Promise<AuthResponse>;
    logoutWithSync(): Promise<void>;
    /**
     * Create a new role enrollment application
     * POST /enrollments
     */
    createEnrollment(data: EnrollmentCreateData): Promise<Enrollment>;
    /**
     * Get current user's enrollment history
     * GET /enrollments/my
     */
    getMyEnrollments(): Promise<Enrollment[]>;
    /**
     * Get all enrollments (admin only)
     * GET /admin/enrollments
     */
    getAdminEnrollments(params?: {
        role?: string;
        status?: string;
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<EnrollmentListResponse>;
    /**
     * Approve an enrollment (admin only)
     * PATCH /admin/enrollments/:id/approve
     */
    approveEnrollment(id: string, notes?: string): Promise<void>;
    /**
     * Reject an enrollment (admin only)
     * PATCH /admin/enrollments/:id/reject
     */
    rejectEnrollment(id: string, reason: string): Promise<void>;
    /**
     * Put an enrollment on hold (admin only)
     * PATCH /admin/enrollments/:id/hold
     */
    holdEnrollment(id: string, reason: string, requiredFields?: string[]): Promise<void>;
}
export declare const cookieAuthClient: CookieAuthClient;
//# sourceMappingURL=cookie-client.d.ts.map