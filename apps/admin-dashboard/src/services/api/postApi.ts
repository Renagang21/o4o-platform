/**
 * Post API Service
 * 게시글 관련 API 호출 서비스
 */

import axios from 'axios';
import { 
  Post, 
  CreatePostRequest, 
  UpdatePostRequest, 
  PostResponse, 
  PostListResponse,
  MediaUploadResponse,
  Media 
} from '@/types/post.types';

// API 기본 URL (환경변수에서 가져오기)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 쿠키 포함
});

// 요청 인터셉터 (토큰 추가)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

/**
 * 게시글 API
 */
export const postApi = {
  // 게시글 생성
  create: async (data: CreatePostRequest): Promise<PostResponse> => {
    try {
      const response = await apiClient.post('/posts', data);
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Failed to create post:', error);
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
      console.error('Failed to get post:', error);
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
      console.error('Failed to update post:', error);
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
      console.error('Failed to delete post:', error);
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
      console.error('Failed to publish post:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to publish post' 
      };
    }
  },

  // 임시 저장
  saveDraft: async (data: CreatePostRequest | UpdatePostRequest): Promise<PostResponse> => {
    try {
      const endpoint = 'id' in data ? `/posts/${data.id}/draft` : '/posts/draft';
      const response = await apiClient.post(endpoint, data);
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Failed to save draft:', error);
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
      console.error('Failed to list posts:', error);
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
      console.warn('Autosave failed:', error);
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
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress?.(progress);
          }
        },
      });

      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Failed to upload media:', error);
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
      console.error('Failed to list media:', error);
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
      console.error('Failed to delete media:', error);
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
      console.error('Failed to get categories:', error);
      return { success: false, error: error.message };
    }
  },

  // 태그 목록
  getTags: async () => {
    try {
      const response = await apiClient.get('/tags');
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Failed to get tags:', error);
      return { success: false, error: error.message };
    }
  },

  // 카테고리 생성
  createCategory: async (name: string, description?: string) => {
    try {
      const response = await apiClient.post('/categories', { name, description });
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Failed to create category:', error);
      return { success: false, error: error.message };
    }
  },

  // 태그 생성
  createTag: async (name: string) => {
    try {
      const response = await apiClient.post('/tags', { name });
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Failed to create tag:', error);
      return { success: false, error: error.message };
    }
  },
};