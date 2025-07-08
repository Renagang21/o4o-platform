import { BlockType } from '@/types/block-editor';

export interface BlockEditorPost {
  id?: string;
  title: string;
  content: string; // 검색/요약용 텍스트
  fields: {
    blocks: BlockType[];
    editorVersion: string;
    lastModified: Date;
  };
  status: 'draft' | 'published' | 'archived';
  meta?: {
    seoTitle?: string;
    seoDescription?: string;
    featured?: boolean;
    thumbnail?: string;
    tags?: string[];
  };
}

export interface CreatePostRequest {
  postTypeSlug: string;
  title: string;
  content: string;
  fields: Record<string, any>;
  status?: 'draft' | 'published' | 'archived';
  authorId?: string;
  meta?: Record<string, any>;
}

export interface CreatePostResponse {
  success: boolean;
  data?: {
    id: string;
    title: string;
    content: string;
    fields: Record<string, any>;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
}

export interface GetPostResponse {
  success: boolean;
  data?: {
    id: string;
    title: string;
    content: string;
    fields: Record<string, any>;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
}

/**
 * 블록 에디터 전용 API 클라이언트
 */
export class BlockEditorAPI {
  private baseURL: string;
  private token?: string;

  constructor(baseURL = '/api', token?: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * 블록 에디터 데이터를 포함한 포스트 생성
   */
  async createPost(postData: BlockEditorPost): Promise<CreatePostResponse> {
    try {
      // 블록 데이터를 텍스트로 변환 (검색용)
      const contentText = this.blocksToText(postData.fields.blocks);

      const requestData: CreatePostRequest = {
        postTypeSlug: 'blog', // 기본값
        title: postData.title,
        content: postData.content || contentText,
        fields: {
          blocks: postData.fields.blocks,
          editorVersion: postData.fields.editorVersion || '1.0',
          lastModified: new Date().toISOString(),
        },
        status: postData.status || 'draft',
        authorId: 'system', // TODO: 실제 사용자 ID로 교체
        meta: postData.meta || {},
      };

      const response = await this.request<CreatePostResponse>(
        '/post-creation/create',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
        }
      );

      return response;
    } catch (error) {
      console.error('Failed to create post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 포스트 조회 (블록 데이터 포함)
   */
  async getPost(postId: string): Promise<GetPostResponse> {
    try {
      const response = await this.request<GetPostResponse>(
        `/post-creation/posts/${postId}`,
        {
          method: 'GET',
        }
      );

      return response;
    } catch (error) {
      console.error('Failed to get post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 포스트 업데이트
   */
  async updatePost(postId: string, postData: Partial<BlockEditorPost>): Promise<CreatePostResponse> {
    try {
      const updateData: Partial<CreatePostRequest> = {};

      if (postData.title) updateData.title = postData.title;
      if (postData.content) updateData.content = postData.content;
      if (postData.fields) {
        updateData.fields = {
          blocks: postData.fields.blocks,
          editorVersion: postData.fields.editorVersion || '1.0',
          lastModified: new Date().toISOString(),
        };
      }
      if (postData.status) updateData.status = postData.status;
      if (postData.meta) updateData.meta = postData.meta;

      const response = await this.request<CreatePostResponse>(
        `/post-creation/posts/${postId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      );

      return response;
    } catch (error) {
      console.error('Failed to update post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 블록 데이터를 검색 가능한 텍스트로 변환
   */
  private blocksToText(blocks: BlockType[]): string {
    return blocks
      .map((block) => {
        switch (block.type) {
          case 'paragraph':
            return block.attributes.content || '';
          case 'heading':
            return block.attributes.content || '';
          case 'image':
            return block.attributes.caption || block.attributes.alt || '';
          case 'list':
            return block.attributes.items?.map((item: any) => item.content).join(' ') || '';
          default:
            return '';
        }
      })
      .filter(Boolean)
      .join(' ');
  }

  /**
   * API 서버 연결 테스트
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request('/health', { method: 'GET' });
      return { success: true, message: 'API 서버 연결 성공' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'API 서버 연결 실패',
      };
    }
  }
}

// 기본 API 클라이언트 인스턴스
export const blockEditorAPI = new BlockEditorAPI();