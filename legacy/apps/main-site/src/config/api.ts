/**
 * Centralized API Configuration
 * Single source of truth for all API endpoints
 */

const getApiBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_URL;
  if (!url) {
    if (import.meta.env.DEV) {
      return 'http://localhost:3000/api';
    }
    return 'https://api.neture.co.kr/api';
  }
  return url;
};

export const API_BASE_URL = getApiBaseUrl();

export const API_PATHS = {
  V1: '/v1',
  PUBLIC: '/public',
} as const;

export const API_URLS = {
  BASE: API_BASE_URL,
  V1: `${API_BASE_URL}/v1`,
  PUBLIC: `${API_BASE_URL}/public`,
} as const;

export const buildApiUrl = (path: string, version?: 'v1' | 'public'): string => {
  if (version === 'v1') {
    return `${API_URLS.V1}${path}`;
  }
  if (version === 'public') {
    return `${API_URLS.PUBLIC}${path}`;
  }
  return `${API_BASE_URL}${path}`;
};

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
