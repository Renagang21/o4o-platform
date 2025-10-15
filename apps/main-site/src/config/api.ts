/**
 * API Configuration
 * Centralized API URL configuration to avoid hardcoding
 */

// Get API base URL from environment variable
const getApiBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_URL;

  if (!url) {
    // Development fallback
    if (import.meta.env.DEV) {
      return 'http://localhost:3000/api';
    }
    // Production default
    return 'https://api.neture.co.kr/api';
  }

  return url;
};

/**
 * Primary API base URL
 * Used by services/api.ts apiClient
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * API version paths
 * For endpoints that need specific versioning
 */
export const API_PATHS = {
  V1: '/v1',
  PUBLIC: '/public',
} as const;

/**
 * Full versioned URLs
 */
export const API_URLS = {
  BASE: API_BASE_URL,
  V1: `${API_BASE_URL}/v1`,
  PUBLIC: `${API_BASE_URL}/public`,
} as const;

/**
 * Helper function to build API URLs
 */
export const buildApiUrl = (path: string, version?: 'v1' | 'public'): string => {
  if (version === 'v1') {
    return `${API_URLS.V1}${path}`;
  }
  if (version === 'public') {
    return `${API_URLS.PUBLIC}${path}`;
  }
  return `${API_BASE_URL}${path}`;
};

/**
 * Common endpoint paths
 */
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    VERIFY: '/auth/verify',
  },
  SETTINGS: {
    HOMEPAGE: '/settings/homepage',
    CUSTOMIZER: '/settings/customizer',
    BUTTON: '/settings/button',
    BREADCRUMBS: '/settings/breadcrumbs',
    SCROLL_TO_TOP: '/settings/scroll-to-top',
  },
  MENUS: {
    LOCATIONS: (slug: string) => `/menus/locations/${slug}`,
  },
  PAGES: {
    DETAIL: (id: string) => `/pages/${id}`,
  },
  POSTS: {
    LIST: '/posts',
    DETAIL: (id: string) => `/posts/${id}`,
    BY_SLUG: (slug: string) => `/public/posts/post/${slug}`,
  },
} as const;
