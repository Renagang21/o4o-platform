/**
 * Block Data Type Definitions
 * Types for block editor data integration
 */

export interface BlockData {
  id: string;
  title: string;
  content: any;
  excerpt?: string;
  featuredImage?: string | null;
  customFields: Record<string, any>;
  author?: {
    id: string;
    name: string;
    email?: string;
  };
  status: string;
  template?: string;
  meta: Record<string, any>;
  dynamicSources: DynamicSources;
}

export interface DynamicSources {
  [fieldName: string]: any;
  featuredImage?: string;
  backgroundImage?: string;
  coverImage?: string;
  subtitle?: string;
  tagline?: string;
  description?: string;
}

export interface BlockDataRequest {
  postId: string;
  postType?: 'post' | 'page' | 'custom';
  fields?: string[];
  includeACF?: boolean;
  includeMeta?: boolean;
}

export interface BlockDataResponse {
  success: boolean;
  data?: BlockData;
  error?: string;
  source?: 'cache' | 'database' | 'not-found';
}

export interface FeaturedImageResponse {
  success: boolean;
  data?: string | null;
  source?: 'cache' | 'database' | 'not-found';
}

export interface ACFFieldResponse {
  success: boolean;
  data?: any;
  source?: 'cache' | 'database' | 'not-found';
}

export interface DynamicContentRequest {
  postId?: string;
  postType?: string;
  fields?: string[];
  includeACF?: boolean;
  includeMeta?: boolean;
}

export interface DynamicContentResponse {
  success: boolean;
  data?: {
    postId: string;
    postType: string;
    [key: string]: any;
  };
}

export interface BlockCacheOptions {
  enableCache?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
}

export interface UseBlockDataOptions extends BlockCacheOptions {
  enabled?: boolean;
  onSuccess?: (data: BlockData) => void;
  onError?: (error: Error) => void;
}