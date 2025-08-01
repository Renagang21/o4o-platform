/**
 * CPT/ACF Loop Block Type Definitions
 */

export interface BlockAttributes {
  postType: string;
  postsPerPage: number;
  orderBy: 'date' | 'title' | 'menu_order' | 'rand';
  order: 'asc' | 'desc';
  selectedACFFields: string[];
  layoutType: 'grid' | 'list';
  columnsDesktop: number;
  columnsTablet: number;
  columnsMobile: number;
}

export interface PostType {
  slug: string;
  name: string;
  rest_base: string;
  description?: string;
  hierarchical?: boolean;
  has_archive?: boolean;
  supports?: string[];
}

export interface ACFField {
  key: string;
  name: string;
  label: string;
  type: string;
  value?: any;
}

export interface Post {
  id: number;
  title: {
    rendered: string;
  };
  excerpt?: {
    rendered: string;
  };
  content?: {
    rendered: string;
  };
  date: string;
  modified: string;
  link: string;
  slug: string;
  status: string;
  type: string;
  featured_media?: number;
  author?: number;
  categories?: number[];
  tags?: number[];
  acf?: Record<string, any>;
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      id: number;
      source_url: string;
      alt_text: string;
      media_details?: {
        sizes?: Record<string, {
          source_url: string;
          width: number;
          height: number;
        }>;
      };
    }>;
    author?: Array<{
      id: number;
      name: string;
      avatar_urls?: Record<string, string>;
    }>;
  };
}

export interface QueryParams {
  per_page: number;
  orderby: string;
  order: string;
  _embed?: boolean;
  _fields?: string[];
  offset?: number;
  exclude?: number[];
  include?: number[];
  search?: string;
  status?: string;
  categories?: number[];
  tags?: number[];
  [key: string]: any;
}