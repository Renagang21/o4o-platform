import { Block } from '../types';

/**
 * API Request/Response Types
 * Based on O4O_PLATFORM_INTEGRATION_SPEC.md Section 3
 */

export interface SEOMetadata {
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
}

export interface PageCreateRequest {
  title: string;
  slug: string;
  content: Block[];
  excerpt?: string;
  status: 'draft' | 'publish' | 'pending' | 'private';
  type: 'page';
  template?: string;
  parentId?: string | null;
  menuOrder?: number;
  showInMenu?: boolean;
  isHomepage?: boolean;
  seo?: SEOMetadata;
  customFields?: Record<string, any>;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  layoutSettings?: Record<string, any>;
}

export interface PageResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
    slug: string;
    content: Block[];
    status: string;
    createdAt: string;
    updatedAt: string;
    author?: any;
  };
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
  code?: string;
}
