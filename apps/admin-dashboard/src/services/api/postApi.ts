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
// Production: admin.neture.co.kr에서는 같은 도메인의 /api 사용
// Development: localhost:3000/api 사용
const getApiBaseUrl = () => {
  // 환경변수가 설정되어 있으면 사용
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Production 환경 (admin.neture.co.kr)
  if (window.location.hostname === 'admin.neture.co.kr') {
    return 'https://admin.neture.co.kr/api';
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

// 요청 인터셉터 (토큰 추가)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // 개발 환경에서 토큰이 없으면 테스트 토큰 생성
    else if (import.meta.env.DEV) {
      const testToken = 'test-token-for-development';
      config.headers.Authorization = `Bearer ${testToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// V1 API 요청 인터셉터 (토큰 추가)
apiV1Client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // 개발 환경에서 토큰이 없으면 테스트 토큰 생성
    else if (import.meta.env.DEV) {
      const testToken = 'test-token-for-development';
      config.headers.Authorization = `Bearer ${testToken}`;
    }
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
    // Use mock API if configured or API is not available
    if (shouldUseMockApi() || import.meta.env.DEV) {
      return mockPostApi.create(data);
    }
    
    try {
      const response = await apiV1Client.post('/posts', data);
      return { success: true, data: response.data };
    } catch (error: any) {
      // Fallback to mock API on error in development
      if (import.meta.env.DEV && error.response?.status === 401) {
        // console.warn('API authentication failed, using mock API');
        return mockPostApi.create(data);
      }
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to create post' 
      };
    }
  },

  // 게시글 조회
  get: async (id: string): Promise<PostResponse> => {
    try {
      const response = await apiClient.get(`/posts/${id}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to get post' 
      };
    }
  },

  // 게시글 수정
  update: async (data: UpdatePostRequest): Promise<PostResponse> => {
    try {
      const { id, ...updateData } = data;
      const response = await apiClient.put(`/posts/${id}`, updateData);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to update post' 
      };
    }
  },

  // 게시글 삭제
  delete: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiClient.delete(`/posts/${id}`);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to delete post' 
      };
    }
  },

  // 게시글 발행
  publish: async (id: string): Promise<PostResponse> => {
    try {
      const response = await apiClient.post(`/posts/${id}/publish`);
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
    // Use mock API if configured or API is not available
    if (shouldUseMockApi() || import.meta.env.DEV) {
      return mockPostApi.saveDraft(data);
    }
    
    try {
      const endpoint = 'id' in data ? `/posts/${data.id}/draft` : '/posts/draft';
      const response = await apiV1Client.post(endpoint, data);
      return { success: true, data: response.data };
    } catch (error: any) {
      // Fallback to mock API on error in development
      if (import.meta.env.DEV && error.response?.status === 401) {
        // console.warn('API authentication failed, using mock API');
        return mockPostApi.saveDraft(data);
      }
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to save draft' 
      };
    }
  },

  // 게시글 목록 조회
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
      const response = await apiClient.get('/posts', { params });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to list posts' 
      };
    }
  },

  // 자동 저장 (디바운스 처리 필요)
  autoSave: async (id: string, data: Partial<CreatePostRequest>): Promise<PostResponse> => {
    try {
      const response = await apiClient.post(`/posts/${id}/autosave`, data);
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
  // 파일 업로드
  upload: async (file: File, onProgress?: (progress: number) => void): Promise<MediaUploadResponse> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/media/upload', formData, {
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

  // 미디어 목록 조회
  list: async (params?: {
    page?: number;
    pageSize?: number;
    type?: string;
  }): Promise<{ success: boolean; data?: Media[]; error?: string }> => {
    try {
      const response = await apiClient.get('/media', { params });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to list media' 
      };
    }
  },

  // 미디어 삭제
  delete: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiClient.delete(`/media/${id}`);
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
  // 카테고리 목록
  getCategories: async () => {
    try {
      const response = await apiClient.get('/categories');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // 태그 목록
  getTags: async () => {
    try {
      const response = await apiClient.get('/tags');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // 카테고리 생성
  createCategory: async (name: string, description?: string) => {
    try {
      const response = await apiClient.post('/categories', { name, description });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // 태그 생성
  createTag: async (name: string) => {
    try {
      const response = await apiClient.post('/tags', { name });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};