import { JSONContent } from '@tiptap/react';

/**
 * Content type definitions
 */

export type ContentType = 'page' | 'post' | 'product' | 'notice';
export type ContentStatus = 'draft' | 'published' | 'archived';

export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  customMeta?: Array<{
    name: string;
    content: string;
    type: 'name' | 'property' | 'httpEquiv';
  }>;
}

export interface Content {
  id: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
  content: JSONContent;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  author: string;
  category?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  views: number;
  seo?: SEOMetadata;
}

export interface ContentFormData {
  title: string;
  type: ContentType;
  status: ContentStatus;
  content: JSONContent;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  category?: string;
  tags: string[];
  seo?: SEOMetadata;
}

export interface ContentFilters {
  search: string;
  type: ContentType | 'all';
  status: ContentStatus | 'all';
  author: string;
  category: string;
}
