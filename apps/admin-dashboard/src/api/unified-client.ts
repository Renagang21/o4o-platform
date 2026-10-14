import axios, { AxiosInstance, AxiosError } from 'axios';
import { adminAuthClient } from '@/lib/auth-client';
import toast from 'react-hot-toast';

/**
 * Unified API Client for O4O Platform
 * 
 * This client provides a single, consistent interface for all API calls
 * with standardized error handling, authentication, and versioning.
 */
class UnifiedApiClient {
  private client: AxiosInstance;
  private baseURL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';
  private version = 'v1';

  constructor() {
    // Remove /v1 from baseURL if it already exists to avoid duplication
    if (this.baseURL.endsWith('/v1')) {
      this.baseURL = this.baseURL.slice(0, -3); // Remove '/v1'
    }
    
    // Add /api prefix to baseURL if not present
    if (!this.baseURL.endsWith('/api')) {
      this.baseURL = `${this.baseURL}/api`;
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
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // if (import.meta.env.DEV) {
        // }
        return response;
      },
      async (error: AxiosError) => {
        // Preserve legacy /api routes but delegate authentication to the provider's
        // cookie client. Its refresh queue/generation owns failures and late responses.
        const originalRequest = error.config;
        if (error.response?.status === 401 && originalRequest) {
          try {
            return await adminAuthClient.api.request({ ...originalRequest, baseURL: this.baseURL });
          } catch (failure) {
            return this.handleError(failure as AxiosError);
          }
        }
        return this.handleError(error);
      }
    );
  }

  private handleError(error: AxiosError): Promise<never> {
    const status = error.response?.status;

    // console.error('[UnifiedAPI] Error:', {
    //   status,
    //   url: error.config?.url,
    //   method: error.config?.method,
    //   responseData: error.response?.data,
    //   message: error.message
    // });

    switch (status) {
      case 401:
        toast.error('인증이 만료되었습니다. 다시 로그인해 주세요.');
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

  // Versioned API methods
  private v1(path: string): string {
    return `/${this.version}${path}`;
  }

  // Content API
  content = {
    // (제거됨) content.posts — WO-O4O-POST-LEGACY-EDITOR-API-BUILD-AND-ORPHAN-RESIDUE-CLEANUP-V1
    //   판정 `DEAD_FRONTEND_API_RESIDUE`. 유일한 소비처였던 `ContentApi` 의 Posts 계열이
    //   같은 WO 에서 제거돼 소비처 0 이 됐고, 서버에도 `/api/v1/content/posts` mount 가 없다
    //   (`/api/v1/content/*` = assets · templates 만). 재추가 금지 — canonical 콘텐츠 축은
    //   `cms_contents` + RichTextEditor 다.
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

  // WO-O4O-CROSSSERVICE-B2B-SUPPLIER-TO-STORE-ORDER-CANONICAL-CONTRACT-V1 (결함 D2):
  //   `ecommerce = { products, orders, cart }` 블록을 제거했다.
  //   전부 /api/v1/ecommerce/* 를 호출했으나 서버에 그 mount 가 없다(dead route, 소비처 0).
  //   내용도 소비자 commerce(cart·coupon·주문 상태 변경)라 O4O-STORE-COMMERCE-BOUNDARY-V1 §10
  //   개발 금지선 대상이다. 재추가 금지 — 매장의 공급자 주문(B2B)은
  //   /api/v1/{service}/checkout/orders · /api/v1/store/cart/:serviceKey/* 가 canonical 이다.

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
    logout: () => adminAuthClient.logout(),
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