/**
 * CMS V2 API Client
 *
 * Connects main-site to CMS V2 backend API
 * Fetches pages, views, CPTs, and fields from CMS
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

export interface CMSPage {
  id: string;
  slug: string;
  title: string;
  viewId?: string;
  view?: CMSView;
  content: Record<string, any>;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
    noIndex?: boolean;
  };
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  publishedAt?: string;
  scheduledAt?: string;
  versions?: any[];
  currentVersion: number;
  siteId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CMSView {
  id: string;
  slug: string;
  name: string;
  description?: string;
  type: 'page' | 'section' | 'component' | 'layout';
  status: 'draft' | 'active' | 'archived';
  schema: CMSViewSchema;
  postTypeSlug?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CMSViewSchema {
  version: string; // "2.0"
  type: string;
  components: CMSComponent[];
  bindings?: Array<{
    source: 'cpt' | 'api' | 'store' | 'static';
    target: string;
    query?: Record<string, any>;
  }>;
  styles?: {
    theme?: string;
    customCSS?: string;
    variables?: Record<string, string>;
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
}

export interface CMSComponent {
  id: string;
  type: string;
  props: Record<string, any>;
  children?: CMSComponent[];
  slots?: Record<string, CMSComponent[]>;
}

export interface CMSCustomPostType {
  id: string;
  slug: string;
  name: string;
  description?: string;
  schema: any;
  status: 'draft' | 'active' | 'archived';
  siteId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch a published page by slug (public endpoint, no auth required)
 */
export async function fetchPageBySlug(slug: string): Promise<CMSPage | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/cms/public/page/${slug}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      return null;
    }

    return result.data.page;
  } catch (error) {
    console.error('Error fetching page:', error);
    return null;
  }
}

/**
 * Fetch view by ID (public endpoint for published views)
 */
export async function fetchViewById(viewId: string): Promise<CMSView | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/cms/public/view/${viewId}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching view:', error);
    return null;
  }
}

/**
 * Fetch CPT by slug (for binding data to views)
 */
export async function fetchCPTBySlug(slug: string): Promise<CMSCustomPostType | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/cms/public/cpt/${slug}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching CPT:', error);
    return null;
  }
}

/**
 * Check if a page exists and is published
 */
export async function checkPageExists(slug: string): Promise<boolean> {
  const page = await fetchPageBySlug(slug);
  return page !== null && page.status === 'published';
}

/**
 * Get SEO metadata for a page
 */
export async function getPageSEO(slug: string): Promise<CMSPage['seo'] | null> {
  const page = await fetchPageBySlug(slug);
  return page?.seo || null;
}

/**
 * Error handling helper
 */
export class CMSClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'CMSClientError';
  }
}
