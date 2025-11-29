import axios from 'axios';
export class AuthClient {
    baseURL;
    api;
    isRefreshing = false;
    refreshSubscribers = [];
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.api = axios.create({
            baseURL: this.baseURL,
            timeout: 120000, // 120 seconds for AI generation
            headers: {
                'Content-Type': 'application/json',
            },
        });
        // Add auth token to requests
        this.api.interceptors.request.use((config) => {
            // Check multiple possible token locations
            // Priority: accessToken > token > authToken > admin-auth-storage
            let token = localStorage.getItem('accessToken') ||
                localStorage.getItem('token') ||
                localStorage.getItem('authToken');
            // Also check admin-auth-storage for token
            if (!token) {
                const authStorage = localStorage.getItem('admin-auth-storage');
                if (authStorage) {
                    try {
                        const parsed = JSON.parse(authStorage);
                        if (parsed.state?.accessToken || parsed.state?.token) {
                            token = parsed.state.accessToken || parsed.state.token;
                        }
                    }
                    catch {
                        // Ignore parse errors
                    }
                }
            }
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });
        // Add response interceptor for auto-refresh
        this.api.interceptors.response.use((response) => response, async (error) => {
            const originalRequest = error.config;
            // Check if error is 401 and not already retried
            if (error.response?.status === 401 && !originalRequest._retry) {
                if (this.isRefreshing) {
                    // Wait for token refresh
                    return new Promise((resolve) => {
                        this.refreshSubscribers.push((token) => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            resolve(this.api.request(originalRequest));
                        });
                    });
                }
                originalRequest._retry = true;
                this.isRefreshing = true;
                try {
                    const refreshToken = localStorage.getItem('refreshToken');
                    if (refreshToken) {
                        // baseURL already includes /api/v1
                        const response = await this.api.post('/auth/refresh', { refreshToken });
                        const { accessToken, refreshToken: newRefreshToken } = response.data;
                        // Update tokens
                        localStorage.setItem('accessToken', accessToken);
                        if (newRefreshToken) {
                            localStorage.setItem('refreshToken', newRefreshToken);
                        }
                        // Update auth storage if exists
                        const authStorage = localStorage.getItem('admin-auth-storage');
                        if (authStorage) {
                            try {
                                const parsed = JSON.parse(authStorage);
                                if (parsed.state) {
                                    parsed.state.token = accessToken;
                                    parsed.state.accessToken = accessToken;
                                    if (newRefreshToken) {
                                        parsed.state.refreshToken = newRefreshToken;
                                    }
                                    localStorage.setItem('admin-auth-storage', JSON.stringify(parsed));
                                }
                            }
                            catch {
                                // Ignore parse errors
                            }
                        }
                        // Notify subscribers
                        this.refreshSubscribers.forEach(callback => callback(accessToken));
                        this.refreshSubscribers = [];
                        // Retry original request
                        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                        return this.api.request(originalRequest);
                    }
                }
                catch (refreshError) {
                    // Refresh failed, clear tokens and redirect to login
                    this.clearAllTokens();
                    // Show user-friendly message before redirect
                    if (typeof window !== 'undefined') {
                        const errorData = refreshError?.response?.data;
                        if (errorData?.code === 'TOKEN_EXPIRED') {
                            console.warn('Session expired, redirecting to login');
                        }
                        else {
                            console.warn('Authentication failed, redirecting to login');
                        }
                        // Redirect to login page
                        window.location.href = '/login';
                    }
                    return Promise.reject(refreshError);
                }
                finally {
                    this.isRefreshing = false;
                }
            }
            return Promise.reject(error);
        });
    }
    async login(credentials) {
        // baseURL already includes /api/v1, so just add /auth/login
        const response = await this.api.post('/auth/login', credentials);
        return response.data;
    }
    // Clear all authentication tokens from all storage locations
    clearAllTokens() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        localStorage.removeItem('admin-auth-storage');
        // Also clear any cookies if present
        if (typeof document !== 'undefined') {
            document.cookie = 'accessToken=; Max-Age=0; path=/';
            document.cookie = 'refreshToken=; Max-Age=0; path=/';
        }
    }
    async logout() {
        try {
            // baseURL already includes /api/v1
            await this.api.post('/auth/logout', {});
        }
        catch (error) {
            // Even if logout fails (e.g., token expired), continue with local cleanup
            // This is normal if token expired
        }
        finally {
            // Always clear local tokens
            this.clearAllTokens();
        }
    }
    async checkSession() {
        try {
            const response = await this.api.get('/accounts/sso/check');
            return response.data;
        }
        catch (error) {
            return { isAuthenticated: false };
        }
    }
}
// Singleton instance
// Use environment-specific API URL
const getApiUrl = () => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
        // Try to get from environment variables first
        const envApiUrl = window.__ENV__?.VITE_API_URL ||
            (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL);
        if (envApiUrl) {
            // Ensure /api/v1 suffix for all API calls
            return envApiUrl.endsWith('/api/v1') ? envApiUrl :
                envApiUrl.endsWith('/api') ? `${envApiUrl}/v1` :
                    `${envApiUrl}/api/v1`;
        }
        // Auto-detect based on current location for development
        if (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('.local')) {
            return 'http://localhost:3002/api/v1';
        }
    }
    // Default to production API server with /api/v1 path
    return 'https://api.neture.co.kr/api/v1';
};
export const authClient = new AuthClient(getApiUrl());
//# sourceMappingURL=client.js.map