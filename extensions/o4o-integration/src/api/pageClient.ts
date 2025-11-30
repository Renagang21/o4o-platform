import axios, { AxiosInstance } from 'axios';
import { AuthManager } from '../auth/authManager';
import { PageCreateRequest, PageResponse, ApiError } from './types';

/**
 * O4O Platform Page API Client
 * Handles page creation, update, and retrieval
 */
export class PageClient {
  private static readonly API_BASE_URL = 'https://api.neture.co.kr';
  private apiClient: AxiosInstance;

  constructor(private authManager: AuthManager) {
    this.apiClient = axios.create({
      baseURL: PageClient.API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include JWT token
    this.apiClient.interceptors.request.use(async (config) => {
      try {
        const token = await this.authManager.getValidToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        throw new Error('Authentication required. Please login first.');
      }
      return config;
    });

    // Add response interceptor for token refresh on 401
    this.apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.authManager.refreshToken();
            const token = await this.authManager.getValidToken();
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.apiClient(originalRequest);
          } catch (refreshError) {
            // Refresh failed, user needs to login again
            throw new Error('Session expired. Please login again.');
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Create a new page in O4O Platform
   * @param pageData Page creation request data
   * @returns Created page response
   */
  async createPage(pageData: PageCreateRequest): Promise<PageResponse> {
    try {
      const response = await this.apiClient.post<PageResponse>(
        '/api/admin/pages',
        pageData
      );

      if (!response.data.success) {
        throw new Error('Page creation failed: Invalid response format');
      }

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const apiError = error.response?.data as ApiError;
        const message = apiError?.message || error.message;
        throw new Error(`Failed to create page: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Update an existing page
   * @param pageId Page ID
   * @param pageData Page update data
   * @returns Updated page response
   */
  async updatePage(pageId: string, pageData: Partial<PageCreateRequest>): Promise<PageResponse> {
    try {
      const response = await this.apiClient.put<PageResponse>(
        `/api/admin/pages/${pageId}`,
        pageData
      );

      if (!response.data.success) {
        throw new Error('Page update failed: Invalid response format');
      }

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const apiError = error.response?.data as ApiError;
        const message = apiError?.message || error.message;
        throw new Error(`Failed to update page: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Get page by ID
   * @param pageId Page ID
   * @returns Page data
   */
  async getPage(pageId: string): Promise<PageResponse> {
    try {
      const response = await this.apiClient.get<PageResponse>(
        `/api/admin/pages/${pageId}`
      );

      if (!response.data.success) {
        throw new Error('Failed to fetch page: Invalid response format');
      }

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const apiError = error.response?.data as ApiError;
        const message = apiError?.message || error.message;
        throw new Error(`Failed to fetch page: ${message}`);
      }
      throw error;
    }
  }
}
