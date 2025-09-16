/**
 * Post Types Definition
 * 게시글 관련 타입 정의
 */

// 블록 타입
export interface Block {
  id: string;
  type: string;
  content: any;
  attributes?: Record<string, any>;
}

// 게시글 상태
export type PostStatus = 'draft' | 'published' | 'scheduled' | 'private' | 'trash';

// 게시글 타입
export interface Post {
  id: string;
  title: string;
  slug?: string;
  content: Block[];
  excerpt?: string;
  status: PostStatus;
  visibility: 'public' | 'private' | 'password';
  password?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  featuredImage?: {
    id: string;
    url: string;
    alt?: string;
  };
  categories: Category[];
  tags: Tag[];
  publishedAt?: Date;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  meta?: {
    views?: number;
    likes?: number;
    comments?: number;
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  settings: {
    allowComments: boolean;
    allowPingbacks: boolean;
    sticky: boolean;
  };
}

// 카테고리 타입
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent?: string;
  count?: number;
}

// 태그 타입
export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  count?: number;
}

// 미디어 타입
export interface Media {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
  uploadedBy: string;
  uploadedAt: Date;
}

// API 요청 타입
export interface CreatePostRequest {
  title: string;
  content: Block[];
  excerpt?: string;
  status?: PostStatus;
  type?: string; // Content type: 'post' or 'page'
  featuredImageId?: string;
  categoryIds?: string[];
  tagIds?: string[];
  settings?: Partial<Post['settings']>;
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {
  id: string;
}

// API 응답 타입
export interface PostResponse {
  success: boolean;
  data?: Post;
  error?: string;
}

export interface PostListResponse {
  success: boolean;
  data?: {
    posts: Post[];
    total: number;
    page: number;
    pageSize: number;
  };
  error?: string;
}

export interface MediaUploadResponse {
  success: boolean;
  data?: Media;
  error?: string;
}