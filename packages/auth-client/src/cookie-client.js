import axios from 'axios';
export class CookieAuthClient {
    baseURL;
    api;
    refreshPromise = null;
    currentToken = null;
    hasHandledSessionExpiry = false;
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.api = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
            withCredentials: true, // Important for cookies
        });
        // Response interceptor to handle token refresh
        this.api.interceptors.response.use((response) => response, async (error) => {
            const originalRequest = error.config;
            // Skip retry for auth endpoints to avoid infinite loops
            const skipRetryPaths = ['/auth/cookie/me', '/auth/cookie/refresh'];
            const requestPath = originalRequest.url || '';
            if (skipRetryPaths.some(path => requestPath.includes(path))) {
                return Promise.reject(error);
            }
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
        });
    }
    async login(credentials) {
        const response = await this.api.post('/auth/cookie/login', credentials);
        // Store token if returned (for WebSocket auth)
        if (response.data.token) {
            this.currentToken = response.data.token;
        }
        // Reset session expiry flag on successful login
        this.resetSessionExpiryFlag();
        return response.data;
    }
    async register(data) {
        const response = await this.api.post('/auth/cookie/register', data);
        return response.data;
    }
    async logout() {
        try {
            await this.api.post('/auth/cookie/logout');
        }
        catch (error) {
            // Even if logout fails, we should clear local state
        }
        finally {
            this.currentToken = null;
        }
    }
    async logoutAll() {
        await this.api.post('/auth/cookie/logout-all');
        this.currentToken = null;
    }
    async refreshToken() {
        try {
            const config = {
                validateStatus: (status) => status === 200 || status === 401
            };
            const response = await this.api.post('/auth/cookie/refresh', {}, config);
            if (response.status === 401) {
                // Session expired - broadcast event once
                this.handleSessionExpiry();
                return false;
            }
            return response.data.success;
        }
        catch (error) {
            // Network or other errors
            return false;
        }
    }
    /**
     * Handle session expiry by broadcasting event
     * Only happens once per session to avoid spam
     */
    handleSessionExpiry() {
        if (this.hasHandledSessionExpiry) {
            return;
        }
        this.hasHandledSessionExpiry = true;
        if (typeof window !== 'undefined') {
            // Broadcast session-expired event
            localStorage.setItem('auth-session-expired', Date.now().toString());
            // Clean up after a moment
            setTimeout(() => localStorage.removeItem('auth-session-expired'), 100);
        }
    }
    /**
     * Reset session expiry flag (called after successful login)
     */
    resetSessionExpiryFlag() {
        this.hasHandledSessionExpiry = false;
    }
    async getCurrentUser() {
        try {
            const config = {
                validateStatus: (status) => status === 200 || status === 401
            };
            const response = await this.api.get('/auth/cookie/me', config);
            if (response.status === 401) {
                return null;
            }
            return response.data;
        }
        catch (error) {
            return null;
        }
    }
    getApiUrl() {
        return this.baseURL;
    }
    getAccessToken() {
        return this.currentToken;
    }
    // Cross-tab communication for session sync
    setupSessionSync() {
        if (typeof window === 'undefined')
            return;
        // Listen for storage events from other tabs
        window.addEventListener('storage', (event) => {
            if (event.key === 'auth-logout') {
                // Another tab logged out, we should too
                window.location.reload();
            }
            else if (event.key === 'auth-login') {
                // Another tab logged in, refresh our session
                this.refreshToken();
            }
        });
    }
    // Notify other tabs about auth changes
    broadcastAuthChange(type) {
        if (typeof window === 'undefined')
            return;
        // Use localStorage to trigger storage event in other tabs
        const key = `auth-${type}`;
        localStorage.setItem(key, Date.now().toString());
        // Clean up after a moment
        setTimeout(() => localStorage.removeItem(key), 100);
    }
    // Enhanced login with session sync
    async loginWithSync(credentials) {
        const response = await this.login(credentials);
        this.broadcastAuthChange('login');
        return response;
    }
    // Enhanced logout with session sync
    async logoutWithSync() {
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
    async createEnrollment(data) {
        const response = await this.api.post('/enrollments', data);
        return response.data.enrollment;
    }
    /**
     * Get current user's enrollment history
     * GET /enrollments/my
     */
    async getMyEnrollments() {
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
    async getAdminEnrollments(params) {
        const response = await this.api.get('/admin/enrollments', { params });
        return response.data;
    }
    /**
     * Approve an enrollment (admin only)
     * PATCH /admin/enrollments/:id/approve
     */
    async approveEnrollment(id, notes) {
        await this.api.patch(`/admin/enrollments/${id}/approve`, { notes });
    }
    /**
     * Reject an enrollment (admin only)
     * PATCH /admin/enrollments/:id/reject
     */
    async rejectEnrollment(id, reason) {
        await this.api.patch(`/admin/enrollments/${id}/reject`, { reason });
    }
    /**
     * Put an enrollment on hold (admin only)
     * PATCH /admin/enrollments/:id/hold
     */
    async holdEnrollment(id, reason, requiredFields) {
        await this.api.patch(`/admin/enrollments/${id}/hold`, {
            reason,
            required_fields: requiredFields
        });
    }
}
// Helper function to get API URL
function getApiUrl() {
    // Browser environment
    if (typeof window !== 'undefined') {
        // Check for environment variable (Vite)
        try {
            const envUrl = import.meta.env?.VITE_API_URL;
            if (envUrl) {
                // Ensure baseURL includes /api/v1
                return envUrl.endsWith('/api/v1') ? envUrl :
                    envUrl.endsWith('/api') ? `${envUrl}/v1` :
                        `${envUrl}/api/v1`;
            }
        }
        catch {
            // import.meta may not be available in all build contexts
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
//# sourceMappingURL=cookie-client.js.map