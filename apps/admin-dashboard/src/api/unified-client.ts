import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

/**
 * Unified API Client for O4O Platform
 * 
 * This client provides a single, consistent interface for all API calls
 * with standardized error handling, authentication, and versioning.
 */
class UnifiedApiClient {
  private client: AxiosInstance;
  private baseURL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api/v1';
  private version = 'v1';

  constructor() {
    // Remove /v1 from baseURL if it already exists to avoid duplication
    if (this.baseURL.endsWith('/v1')) {
      this.baseURL = this.baseURL.slice(0, -3); // Remove '/v1'
    }
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Enable cross-domain cookies for SSO
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Get token from multiple sources
        let token = this.getAuthToken();
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Dev environment logging
        // if (import.meta.env.DEV) {
        // }
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // if (import.meta.env.DEV) {
        // }
        return response;
      },
      (error: AxiosError) => {
        return this.handleError(error);
      }
    );
  }

  private getAuthToken(): string | null {
    // Check multiple token sources
    let token = useAuthStore.getState().token;
    
    if (!token) {
      token = localStorage.getItem('authToken');
    }
    
    if (!token) {
      const adminStorage = localStorage.getItem('admin-auth-storage');
      if (adminStorage) {
        try {
          const parsed = JSON.parse(adminStorage);
          if (parsed.state?.token) {
            token = parsed.state.token;
          }
        } catch {
          // Failed to parse
        }
      }
    }
    
    return token;
  }

  private handleError(error: AxiosError): Promise<never> {
    const status = error.response?.status;

    switch (status) {
      case 401:
        this.handleUnauthorized();
        break;
      case 403:
        toast.error('접근 권한이 없습니다.');
        break;
      case 404:
        // Silent fail for 404s (handled by fallback data)
        break;
      case 429:
        toast.error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        break;
      case 500:
      case 502:
      case 503:
        toast.error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        break;
      default:
        if (error.code === 'ECONNABORTED') {
          toast.error('요청 시간이 초과되었습니다.');
        }
    }

    return Promise.reject(error);
  }

  private handleUnauthorized() {
    const currentPath = window.location.pathname;
    
    if (currentPath !== '/login') {
      // Clear all auth data
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('authToken');
      localStorage.removeItem('admin-auth-storage');
      
      useAuthStore.getState().logout();
      window.location.href = '/login';
      toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
    }
  }

  // Versioned API methods
  private v1(path: string): string {
    return `/${this.version}${path}`;
  }

  // Content API
  content = {
    posts: {
      list: (params?: any) => this.client.get(this.v1('/content/posts'), { params }),
      get: (id: string) => this.client.get(this.v1(`/content/posts/${id}`)),
      create: (data: any) => this.client.post(this.v1('/content/posts'), data),
      update: (id: string, data: any) => this.client.put(this.v1(`/content/posts/${id}`), data),
      delete: (id: string) => this.client.delete(this.v1(`/content/posts/${id}`)),
    },
    categories: {
      list: (params?: any) => this.client.get(this.v1('/content/categories'), { params }),
      get: (id: string) => this.client.get(this.v1(`/content/categories/${id}`)),
      create: (data: any) => this.client.post(this.v1('/content/categories'), data),
      update: (id: string, data: any) => this.client.put(this.v1(`/content/categories/${id}`), data),
      delete: (id: string) => this.client.delete(this.v1(`/content/categories/${id}`)),
    },
    media: {
      list: (params?: any) => this.client.get(this.v1('/content/media'), { params }),
      get: (id: string) => this.client.get(this.v1(`/content/media/${id}`)),
      upload: (formData: FormData) => this.client.post(this.v1('/content/media/upload'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
      update: (id: string, data: any) => this.client.put(this.v1(`/content/media/${id}`), data),
      delete: (id: string) => this.client.delete(this.v1(`/content/media/${id}`)),
    },
    authors: {
      list: () => this.client.get(this.v1('/content/authors')),
    }
  };

  // Platform API
  platform = {
    apps: {
      list: () => this.client.get(this.v1('/platform/apps')),
      get: (id: string) => this.client.get(this.v1(`/platform/apps/${id}`)),
      updateStatus: (id: string, status: string) => 
        this.client.put(this.v1(`/platform/apps/${id}/status`), { status }),
    },
    settings: {
      get: () => this.client.get(this.v1('/platform/settings')),
      update: (data: any) => this.client.put(this.v1('/platform/settings'), data),
    },
    customPostTypes: {
      list: () => this.client.get(this.v1('/platform/custom-post-types')),
      get: (id: string) => this.client.get(this.v1(`/platform/custom-post-types/${id}`)),
      create: (data: any) => this.client.post(this.v1('/platform/custom-post-types'), data),
      update: (id: string, data: any) => this.client.put(this.v1(`/platform/custom-post-types/${id}`), data),
      delete: (id: string) => this.client.delete(this.v1(`/platform/custom-post-types/${id}`)),
    }
  };

  // E-commerce API
  ecommerce = {
    products: {
      list: (params?: any) => this.client.get(this.v1('/ecommerce/products'), { params }),
      get: (id: string) => this.client.get(this.v1(`/ecommerce/products/${id}`)),
      create: (data: any) => this.client.post(this.v1('/ecommerce/products'), data),
      update: (id: string, data: any) => this.client.put(this.v1(`/ecommerce/products/${id}`), data),
      delete: (id: string) => this.client.delete(this.v1(`/ecommerce/products/${id}`)),
    },
    orders: {
      list: (params?: any) => this.client.get(this.v1('/ecommerce/orders'), { params }),
      get: (id: string) => this.client.get(this.v1(`/ecommerce/orders/${id}`)),
      updateStatus: (id: string, status: string, note?: string) => 
        this.client.put(this.v1(`/ecommerce/orders/${id}/status`), { status, note }),
    },
    cart: {
      get: () => this.client.get(this.v1('/ecommerce/cart')),
      update: (data: any) => this.client.post(this.v1('/ecommerce/cart'), data),
      applyCoupon: (code: string) => this.client.post(this.v1('/ecommerce/cart/coupon'), { code }),
    }
  };

  // Forum API
  forum = {
    posts: {
      list: (params?: any) => this.client.get(this.v1('/forum/posts'), { params }),
      get: (id: string) => this.client.get(this.v1(`/forum/posts/${id}`)),
      create: (data: any) => this.client.post(this.v1('/forum/posts'), data),
      update: (id: string, data: any) => this.client.put(this.v1(`/forum/posts/${id}`), data),
      delete: (id: string) => this.client.delete(this.v1(`/forum/posts/${id}`)),
    },
    categories: {
      list: () => this.client.get(this.v1('/forum/categories')),
      get: (id: string) => this.client.get(this.v1(`/forum/categories/${id}`)),
      create: (data: any) => this.client.post(this.v1('/forum/categories'), data),
    },
    comments: {
      list: (postId: string) => this.client.get(this.v1(`/forum/posts/${postId}/comments`)),
      create: (data: any) => this.client.post(this.v1('/forum/comments'), data),
    }
  };

  // Auth API
  auth = {
    login: (credentials: any) => this.client.post(this.v1('/auth/login'), credentials),
    logout: () => this.client.post(this.v1('/auth/logout')),
    register: (data: any) => this.client.post(this.v1('/auth/register'), data),
    me: () => this.client.get(this.v1('/auth/me')),
    refresh: () => this.client.post(this.v1('/auth/refresh')),
  };

  // Direct client access for custom requests
  get raw() {
    return this.client;
  }
}

// Export singleton instance
export const unifiedApi = new UnifiedApiClient();

// Export for type safety
export type UnifiedApiType = typeof unifiedApi;