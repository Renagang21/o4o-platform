import axios from 'axios';
export class AuthClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.api = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        // Add auth token to requests
        this.api.interceptors.request.use((config) => {
            // Check multiple possible token locations
            let token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
            // Also check admin-auth-storage for token
            if (!token) {
                const authStorage = localStorage.getItem('admin-auth-storage');
                if (authStorage) {
                    try {
                        const parsed = JSON.parse(authStorage);
                        if (parsed.state?.token) {
                            token = parsed.state.token;
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
    }
    async login(credentials) {
        // For production API server, use the correct auth endpoint
        let authUrl;
        if (this.baseURL.includes('api.neture.co.kr')) {
            // Production API server - use /api/auth/login
            authUrl = 'https://api.neture.co.kr/api/auth/login';
        }
        else {
            // Development - remove /api/v1 prefix for auth endpoints
            authUrl = `${this.baseURL.replace('/api/v1', '/api')}/auth/login`;
        }
        const response = await axios.post(authUrl, credentials);
        return response.data;
    }
    async logout() {
        // For production API server, use the correct auth endpoint
        let authUrl;
        if (this.baseURL.includes('api.neture.co.kr')) {
            // Production API server - use /api/auth/logout
            authUrl = 'https://api.neture.co.kr/api/auth/logout';
        }
        else {
            // Development - remove /api/v1 prefix for auth endpoints
            authUrl = `${this.baseURL.replace('/api/v1', '/api')}/auth/logout`;
        }
        await axios.post(authUrl);
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
// Use environment variable or default based on hostname
const getApiUrl = () => {
    // Always use production API server
    const DEFAULT_API_URL = 'https://api.neture.co.kr/api/v1';
    if (typeof window === 'undefined') {
        return DEFAULT_API_URL;
    }
    // Check for environment variable first (Vite specific)
    try {
        // @ts-ignore - Vite environment variable
        if (globalThis.import?.meta?.env?.VITE_API_URL) {
            // @ts-ignore
            return globalThis.import.meta.env.VITE_API_URL;
        }
    }
    catch {
        // Ignore if import.meta is not available
    }
    // Check window global variable (for runtime config)
    if (window.__API_URL__) {
        return window.__API_URL__;
    }
    // Always return production API URL
    return DEFAULT_API_URL;
};
export const authClient = new AuthClient(getApiUrl());
