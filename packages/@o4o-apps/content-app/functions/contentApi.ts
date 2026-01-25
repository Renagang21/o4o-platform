/**
 * Content App API Client
 *
 * 콘텐츠 CRUD 작업을 위한 API 클라이언트
 */

import type {
  Content,
  ContentTemplate,
  CreateContentRequest,
  UpdateContentRequest,
  ContentListParams,
  ApiResponse,
  PaginatedResponse,
} from '../types/ContentTypes.js';

/**
 * Content API Client Factory
 *
 * @param baseUrl - API 서버 기본 URL
 * @param getAuthToken - 인증 토큰을 반환하는 함수
 */
export function createContentApi(
  baseUrl: string,
  getAuthToken: () => string | null
) {
  const headers = () => {
    const token = getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  return {
    /**
     * 콘텐츠 목록 조회
     */
    getContents: async (
      params?: ContentListParams
    ): Promise<PaginatedResponse<Content>> => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach((v) => queryParams.append(key, String(v)));
            } else {
              queryParams.append(key, String(value));
            }
          }
        });
      }

      const url = `${baseUrl}/api/v1/content${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, { headers: headers() });

      if (!response.ok) {
        throw new Error(`Failed to fetch contents: ${response.statusText}`);
      }

      return response.json();
    },

    /**
     * 콘텐츠 상세 조회
     */
    getContent: async (id: string): Promise<ApiResponse<Content>> => {
      const response = await fetch(`${baseUrl}/api/v1/content/${id}`, {
        headers: headers(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`);
      }

      return response.json();
    },

    /**
     * 콘텐츠 생성
     */
    createContent: async (
      data: CreateContentRequest
    ): Promise<ApiResponse<Content>> => {
      const response = await fetch(`${baseUrl}/api/v1/content`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create content: ${response.statusText}`);
      }

      return response.json();
    },

    /**
     * 콘텐츠 수정
     */
    updateContent: async (
      id: string,
      data: UpdateContentRequest
    ): Promise<ApiResponse<Content>> => {
      const response = await fetch(`${baseUrl}/api/v1/content/${id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to update content: ${response.statusText}`);
      }

      return response.json();
    },

    /**
     * 콘텐츠 삭제
     */
    deleteContent: async (id: string): Promise<ApiResponse<void>> => {
      const response = await fetch(`${baseUrl}/api/v1/content/${id}`, {
        method: 'DELETE',
        headers: headers(),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete content: ${response.statusText}`);
      }

      return response.json();
    },

    /**
     * 템플릿 목록 조회
     */
    getTemplates: async (): Promise<ApiResponse<ContentTemplate[]>> => {
      const response = await fetch(`${baseUrl}/api/v1/content/templates`, {
        headers: headers(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }

      return response.json();
    },

    /**
     * 콘텐츠 공유 링크 생성
     */
    getShareLink: (id: string): string => {
      return `${baseUrl}/content/${id}`;
    },

    /**
     * 콘텐츠 임베드 코드 생성
     */
    getEmbedCode: (id: string): string => {
      return `<iframe src="${baseUrl}/content/${id}/embed" width="100%" height="400" frameborder="0"></iframe>`;
    },
  };
}

export type ContentApi = ReturnType<typeof createContentApi>;
