/**
 * Post API Service
 * 게시글 관련 API 호출 서비스
 */

import axios from 'axios';
import { 
  CreatePostRequest, 
  UpdatePostRequest, 
  PostResponse, 
  PostListResponse,
  MediaUploadResponse,
  Media 
} from '@/types/post.types';
import { mockPostApi, mockTaxonomyApi, shouldUseMockApi } from './mockApi';

// API 기본 URL (환경변수에서 가져오기)
// Production: admin.neture.co.kr에서는 api.neture.co.kr 사용
// Development: localhost:3000/api 사용
const getApiBaseUrl = () => {
  // 환경변수가 설정되어 있으면 사용
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Production 환경 (admin.neture.co.kr -> api.neture.co.kr)
  if (window.location.hostname === 'admin.neture.co.kr') {
    return 'https://api.neture.co.kr/api';
  }
  
  // Development 환경
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();
const API_V1_URL = `${API_BASE_URL}/v1/content`;

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 쿠키 포함
});

// V1 API용 Axios 인스턴스
const apiV1Client = axios.create({
  baseURL: API_V1_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Dev-only response logging for post endpoints
apiClient.interceptors.response.use(
  (response) => {
    try {
      if (import.meta.env?.DEV && response?.config?.url) {
        const fullUrl = `${response.config.baseURL || ''}${response.config.url}`;
        if (/\/v1\/content\/posts|\/api\/posts/.test(fullUrl)) {
          const data = response.data?.data ?? response.data;
          // eslint-disable-next-line no-console
          console.log('[NET][RES]', {
            method: response.config.method,
            url: fullUrl,
            status: response.status,
            respId: data?.id,
            respSlug: data?.slug,
            at: new Date().toISOString(),
          });
        }
      }
    } catch {}
    return response;
  },
  (error) => Promise.reject(error)
);

apiV1Client.interceptors.response.use(
  (response) => {
    try {
      if (import.meta.env?.DEV && response?.config?.url) {
        const fullUrl = `${response.config.baseURL || ''}${response.config.url}`;
        if (/\/v1\/content\/posts|\/api\/posts/.test(fullUrl)) {
          const data = response.data?.data ?? response.data;
          // eslint-disable-next-line no-console
          console.log('[NET][RES]', {
            method: response.config.method,
            url: fullUrl,
            status: response.status,
            respId: data?.id,
            respSlug: data?.slug,
            at: new Date().toISOString(),
          });
        }
      }
    } catch {}
    return response;
  },
  (error) => Promise.reject(error)
);

// 요청 인터셉터 (토큰 추가)
apiClient.interceptors.request.use(
  (config) => {
    // 여러 위치에서 토큰 확인
    let token = localStorage.getItem('authToken');
    if (!token) {
      token = localStorage.getItem('accessToken');
    }
    if (!token) {
      token = localStorage.getItem('token');
    }
    
    // Zustand store에서도 확인
    if (!token) {
      const adminStorage = localStorage.getItem('admin-auth-storage');
      if (adminStorage) {
        try {
          const parsed = JSON.parse(adminStorage);
          if (parsed.state?.token) {
            token = parsed.state.token;
          }
        } catch {
          // Ignore parse error
        }
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // 개발 환경에서 토큰이 없으면 테스트 토큰 생성
    else if (import.meta.env.DEV) {
      const testToken = 'test-token-for-development';
      config.headers.Authorization = `Bearer ${testToken}`;
    }
    // Dev-only: log post endpoints
    try {
      if (import.meta.env?.DEV && config?.url) {
        const fullUrl = `${config.baseURL || ''}${config.url}`;
        if (/\/v1\/content\/posts|\/api\/posts/.test(fullUrl)) {
          const raw = (config as any).data;
          let payload: any = raw;
          if (typeof raw === 'string') { try { payload = JSON.parse(raw); } catch { /* noop */ } }
          // eslint-disable-next-line no-console
          console.log('[NET][REQ]', {
            method: config.method,
            url: fullUrl,
            payloadId: payload?.id,
            payloadSlug: payload?.slug,
            at: new Date().toISOString(),
          });
        }
      }
    } catch {}
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// V1 API 요청 인터셉터 (토큰 추가)
apiV1Client.interceptors.request.use(
  (config) => {
    // 여러 위치에서 토큰 확인
    let token = localStorage.getItem('authToken');
    if (!token) {
      token = localStorage.getItem('accessToken');
    }
    if (!token) {
      token = localStorage.getItem('token');
    }
    
    // Zustand store에서도 확인
    if (!token) {
      const adminStorage = localStorage.getItem('admin-auth-storage');
      if (adminStorage) {
        try {
          const parsed = JSON.parse(adminStorage);
          if (parsed.state?.token) {
            token = parsed.state.token;
          }
        } catch {
          // Ignore parse error
        }
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // 개발 환경에서 토큰이 없으면 테스트 토큰 생성
    else if (import.meta.env.DEV) {
      const testToken = 'test-token-for-development';
      config.headers.Authorization = `Bearer ${testToken}`;
    }
    // Dev-only: log post endpoints
    try {
      if (import.meta.env?.DEV && config?.url) {
        const fullUrl = `${config.baseURL || ''}${config.url}`;
        if (/\/v1\/content\/posts|\/api\/posts/.test(fullUrl)) {
          const raw = (config as any).data;
          let payload: any = raw;
          if (typeof raw === 'string') { try { payload = JSON.parse(raw); } catch { /* noop */ } }
          // eslint-disable-next-line no-console
          console.log('[NET][REQ]', {
            method: config.method,
            url: fullUrl,
            payloadId: payload?.id,
            payloadSlug: payload?.slug,
            at: new Date().toISOString(),
          });
        }
      }
    } catch {}
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (에러 처리)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 인증 에러 처리
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// V1 API 응답 인터셉터
apiV1Client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 인증 에러 처리
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * 게시글 API
 */
export const postApi = {
  // 게시글 생성 (V1 API 사용)
  create: async (data: CreatePostRequest): Promise<PostResponse> => {
    // Use mock API only if explicitly configured
    if (shouldUseMockApi()) {
      return mockPostApi.create(data);
    }
    
    try {
      if (import.meta.env.DEV) {
        // Debug logging in development only
        const debugLog = (...args: any[]) => {
          // Use logger for debug info
        };
        debugLog('📤 POST /v1/content/posts request:', {
          url: `${API_V1_URL}/posts`,
          data,
          headers: apiV1Client.defaults.headers
        });
      }
      
      const response = await apiV1Client.post('/posts', data);
      
      if (import.meta.env.DEV) {
        // Debug logging in development only
        const debugLog = (...args: any[]) => {
          // Use logger for debug info
        };
        debugLog('✅ POST /v1/content/posts success:', response.data);
      }
      
      return { success: true, data: response.data };
    } catch (error: any) {
      if (import.meta.env.DEV) {
        // Debug logging in development only
        const debugLog = (...args: any[]) => {
          // Use logger for debug info
        };
        debugLog('❌ POST /v1/content/posts failed:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers
          }
        });
      }
      
      return { 
        success: false, 
        error: error.response?.data?.message || `Failed to create post (${error.response?.status})` 
      };
    }
  },

  // 게시글 조회 (V1 API 사용)
  get: async (id: string): Promise<PostResponse> => {
    try {
      const response = await apiV1Client.get(`/posts/${id}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to get post' 
      };
    }
  },

  // 게시글 수정 (V1 API 사용)
  update: async (data: UpdatePostRequest): Promise<PostResponse> => {
    try {
      const { id, ...updateData } = data;
      
      const response = await apiV1Client.put(`/posts/${id}`, updateData);
      
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to update post' 
      };
    }
  },

  // 게시글 삭제 (V1 API 사용)
  delete: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiV1Client.delete(`/posts/${id}`);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to delete post' 
      };
    }
  },

  // 게시글 발행 (V1 API 사용)
  publish: async (id: string): Promise<PostResponse> => {
    try {
      const response = await apiV1Client.post(`/posts/${id}/publish`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to publish post' 
      };
    }
  },

  // 임시 저장 (V1 API 사용)
  saveDraft: async (data: CreatePostRequest | UpdatePostRequest): Promise<PostResponse> => {
    // Use mock API only if explicitly configured
    if (shouldUseMockApi()) {
      return mockPostApi.saveDraft(data);
    }
    
    try {
      const endpoint = 'id' in data ? `/posts/${data.id}/draft` : '/posts/draft';
      
      if (import.meta.env.DEV) {
        // Debug logging in development only
        const debugLog = (...args: any[]) => {
          // Use logger for debug info
        };
        debugLog('📤 POST save draft request:', {
          url: `${API_V1_URL}${endpoint}`,
          data,
          headers: apiV1Client.defaults.headers
        });
      }
      
      const response = await apiV1Client.post(endpoint, data);
      
      if (import.meta.env.DEV) {
        // Debug logging in development only
        const debugLog = (...args: any[]) => {
          // Use logger for debug info
        };
        debugLog('✅ POST save draft success:', response.data);
      }
      
      return { success: true, data: response.data };
    } catch (error: any) {
      if (import.meta.env.DEV) {
        // Debug logging in development only
        const debugLog = (...args: any[]) => {
          // Use logger for debug info
        };
        debugLog('❌ POST save draft failed:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers
          }
        });
      }
      
      return { 
        success: false, 
        error: error.response?.data?.message || `Failed to save draft (${error.response?.status})` 
      };
    }
  },

  // 게시글 목록 조회 (V1 API 사용)
  list: async (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    author?: string;
    category?: string;
    tag?: string;
    search?: string;
  }): Promise<PostListResponse> => {
    try {
      const response = await apiV1Client.get('/posts', { params });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to list posts' 
      };
    }
  },

  // 자동 저장 (V1 API 사용, 디바운스 처리 필요)
  autoSave: async (id: string, data: Partial<CreatePostRequest>): Promise<PostResponse> => {
    try {
      const response = await apiV1Client.post(`/posts/${id}/autosave`, data);
      return { success: true, data: response.data };
    } catch (error: any) {
      // 자동 저장 실패는 조용히 처리
      return { success: false, error: 'Autosave failed' };
    }
  },
};

/**
 * 미디어 API
 */
export const mediaApi = {
  // 파일 업로드 (V1 API 사용)
  upload: async (file: File, onProgress?: (progress: number) => void): Promise<MediaUploadResponse> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiV1Client.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress?.(progress);
          }
        },
      } as any);

      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to upload media' 
      };
    }
  },

  // 미디어 목록 조회 (V1 API 사용)
  list: async (params?: {
    page?: number;
    pageSize?: number;
    type?: string;
  }): Promise<{ success: boolean; data?: Media[]; error?: string }> => {
    try {
      const response = await apiV1Client.get('/media', { params });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to list media' 
      };
    }
  },

  // 미디어 삭제 (V1 API 사용)
  delete: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiV1Client.delete(`/media/${id}`);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to delete media' 
      };
    }
  },
};

/**
 * 카테고리/태그 API
 */
export const taxonomyApi = {
  // 카테고리 목록 (V1 API 사용)
  getCategories: async () => {
    try {
      const response = await apiV1Client.get('/categories');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // 태그 목록 (V1 API 사용)
  getTags: async () => {
    try {
      const response = await apiV1Client.get('/tags');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // 카테고리 생성 (V1 API 사용)
  createCategory: async (name: string, description?: string) => {
    try {
      const response = await apiV1Client.post('/categories', { name, description });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // 태그 생성 (V1 API 사용)
  createTag: async (name: string) => {
    try {
      const response = await apiV1Client.post('/tags', { name });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};
