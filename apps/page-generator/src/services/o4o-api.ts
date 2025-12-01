/**
 * O4O API Client
 * Handles API calls to O4O Platform with automatic JWT injection
 */

import { authManager } from './auth';
import type { PageData } from '../core/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

export interface PageCreateRequest extends PageData {}

export interface PageResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
    slug: string;
    content: any[];
    status: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: any[];
}

export class O4OApiClient {
  /**
   * Create a new page
   */
  async createPage(pageData: PageCreateRequest): Promise<PageResponse> {
    return this.request<PageResponse>('/api/admin/pages', {
      method: 'POST',
      body: JSON.stringify(pageData),
    });
  }

  /**
   * Update an existing page
   */
  async updatePage(id: string, pageData: Partial<PageCreateRequest>): Promise<PageResponse> {
    return this.request<PageResponse>(`/api/admin/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pageData),
    });
  }

  /**
   * Get page by ID
   */
  async getPage(id: string): Promise<PageResponse> {
    return this.request<PageResponse>(`/api/admin/pages/${id}`, {
      method: 'GET',
    });
  }

  /**
   * Generic request handler with automatic JWT injection and retry
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit & { skipAuth?: boolean } = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add JWT token if authenticated
    if (!options.skipAuth) {
      try {
        const token = await authManager.getValidToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        throw new Error('Authentication required. Please login first.');
      }
    }

    // Make request
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies
      });

      // Handle 401 Unauthorized - try refresh token
      if (response.status === 401 && !options.skipAuth) {
        try {
          // Refresh token
          await authManager.refreshToken();

          // Retry original request with new token
          const newToken = await authManager.getValidToken();
          headers['Authorization'] = `Bearer ${newToken}`;

          const retryResponse = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
          });

          if (!retryResponse.ok) {
            throw await this.handleErrorResponse(retryResponse);
          }

          return await retryResponse.json();
        } catch (refreshError) {
          // Refresh failed - clear tokens and throw error
          authManager.clearTokens();
          throw new Error('Session expired. Please login again.');
        }
      }

      // Handle other errors
      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  /**
   * Handle error responses
   */
  private async handleErrorResponse(response: Response): Promise<Error> {
    try {
      const errorData = await response.json();
      const apiError: ApiError = {
        message: errorData.message || 'Request failed',
        statusCode: response.status,
        errors: errorData.errors,
      };

      return new Error(
        apiError.errors
          ? `${apiError.message}: ${JSON.stringify(apiError.errors)}`
          : apiError.message
      );
    } catch (e) {
      return new Error(`Request failed with status ${response.status}`);
    }
  }
}

// Singleton instance
export const apiClient = new O4OApiClient();
