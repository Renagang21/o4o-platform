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

  // Compatibility aliases
  label?: string; // Alias for pluralName/name
  singularLabel?: string; // Alias for singularName
  isActive?: boolean; // Alias for active
  public?: boolean; // Public visibility flag

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

  // Phase 1: Preset IDs
  defaultViewPresetId?: string;
  defaultTemplatePresetId?: string;

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
  metadata?: Record<string, any>; // Alias for compatibility
  customFields?: Record<string, any>;
  acfFields?: Record<string, any>; // Alias for ACF fields
  featuredImage?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  PUBLISH = 'publish', // Alias for published
  PRIVATE = 'private',
  TRASH = 'trash'
}

export interface CPTListOptions {
  page?: number;
  limit?: number;
  status?: PostStatus;
  search?: string;
  orderBy?: string;
  order?: 'ASC' | 'DESC' | 'asc' | 'desc'; // Allow both cases
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
  label: string;
  singularLabel: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  public?: boolean;
  showInMenu?: boolean;
  menuPosition?: number;
  hasArchive?: boolean;
  supports?: string[];
  rewrite?: {
    slug: string;
    withFront: boolean;
  };
  capabilities?: Record<string, string>;
  taxonomies?: string[];
  labels?: Partial<CustomPostType['labels']>;
  showInRest?: boolean;
  // Phase 1: Preset IDs
  defaultViewPresetId?: string;
  defaultTemplatePresetId?: string;
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
  metadata?: Record<string, any>; // Alias for compatibility
  customFields?: Record<string, any>;
  acfFields?: Record<string, any>; // Alias for ACF fields
  featuredImage?: string;
}

export interface UpdatePostDto extends Partial<CreatePostDto> {
  id?: string;
}