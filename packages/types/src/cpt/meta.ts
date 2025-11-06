/**
 * Post Meta Type Definitions - Single Source of Truth (SSOT)
 * Metadata and custom fields for posts
 */

// Basic Post Meta structure (for the meta field in Post)
export interface PostMetaFields {
  // SEO fields
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  ogImage?: string;
  canonicalUrl?: string;

  // Featured content
  featuredImage?: string;
  excerpt?: string;
  featured?: boolean;
  sticky?: boolean;

  // Post format and display
  format?: 'standard' | 'aside' | 'gallery' | 'link' | 'image' | 'quote' | 'status' | 'video' | 'audio' | 'chat';

  // Reading metrics
  readingTime?: number;
  viewCount?: number;
  likes?: number;
  comments?: number;

  // Custom fields (flexible)
  [key: string]: unknown;
}

// Database representation of post meta (for post_meta table)
export interface PostMetaRecord {
  id: string;
  post_id: string;
  postId?: string; // Camel case alias
  meta_key: string;
  metaKey?: string; // Camel case alias
  meta_value: any; // JSONB field
  metaValue?: any; // Camel case alias
  created_at?: Date;
  createdAt?: Date;
  updated_at?: Date;
  updatedAt?: Date;
}

// Post meta item for UI display
export interface PostMetaItem {
  id: string;
  key: string;
  value: any;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  label?: string;
  description?: string;
}

// Batch post meta loading result
export type PostMetaBatch = Map<string, PostMetaRecord[]>;

// Create/Update meta DTO
export interface SavePostMetaDto {
  postId: string;
  metaKey: string;
  metaValue: any;
}

// Batch save meta DTO
export interface SavePostMetaBatchDto {
  postId: string;
  metadata: Record<string, any>;
}
