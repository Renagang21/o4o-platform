/**
 * CPT (Custom Post Type) Type Definitions
 * Frontend types for CPT management
 */

export interface CustomPostType {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  active: boolean;
  supports?: {
    title: boolean;
    editor: boolean;
    thumbnail: boolean;
    excerpt: boolean;
    comments: boolean;
    customFields: boolean;
  };
  labels?: {
    singular: string;
    plural: string;
    addNew: string;
    editItem: string;
    viewItem: string;
  };
  capabilities?: Record<string, string>;
  taxonomies?: string[];
  menuPosition?: number;
  showInMenu?: boolean;
  showInRest?: boolean;
  restBase?: string;
  hasArchive?: boolean;
  rewrite?: {
    slug: string;
    withFront: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomPost {
  id: string;
  postType: string;
  title: string;
  content?: string;
  excerpt?: string;
  slug: string;
  status: PostStatus;
  authorId: string;
  author?: {
    id: string;
    name: string;
    email: string;
  };
  meta?: Record<string, any>;
  customFields?: Record<string, any>;
  featuredImage?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  PRIVATE = 'private',
  TRASH = 'trash'
}

export interface CPTListOptions {
  page?: number;
  limit?: number;
  status?: PostStatus;
  search?: string;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
}

export interface CPTApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateCPTDto {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  active?: boolean;
  supports?: Partial<CustomPostType['supports']>;
  labels?: Partial<CustomPostType['labels']>;
  taxonomies?: string[];
  showInMenu?: boolean;
  showInRest?: boolean;
}

export interface UpdateCPTDto extends Partial<CreateCPTDto> {
  id?: string;
}

export interface CreatePostDto {
  title: string;
  content?: string;
  excerpt?: string;
  slug?: string;
  status?: PostStatus;
  meta?: Record<string, any>;
  customFields?: Record<string, any>;
  featuredImage?: string;
}

export interface UpdatePostDto extends Partial<CreatePostDto> {
  id?: string;
}