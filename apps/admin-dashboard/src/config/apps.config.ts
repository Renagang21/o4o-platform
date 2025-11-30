// Configuration for external apps integration
export const appsConfig = {
  forum: {
    name: 'Forum',
    url: import.meta.env.VITE_FORUM_URL || 'https://forum.neture.co.kr',
    apiEndpoint: '/api/v1/forum',
    icon: 'MessageSquare',
    color: 'primary',
  },
} as const;

// SSO Configuration
export const ssoConfig = {
  enabled: import.meta.env.VITE_SSO_ENABLED === 'true',
  domain: import.meta.env.VITE_SSO_DOMAIN || '.neture.co.kr',
  cookieName: 'o4o_auth_token',
  sessionCheckInterval: 300000, // Check session every 5 minutes (reduced to prevent rate limiting)
};

// API endpoints configuration
export const apiEndpoints = {
  // Authentication
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
    ssoCheck: '/auth/sso/check',
  },
  
  // Users
  users: {
    list: '/users',
    detail: (id: string) => `/users/${id}`,
    create: '/users',
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`,
    roles: '/users/roles',
  },
  
  // E-commerce
  products: {
    list: '/products',
    detail: (id: string) => `/products/${id}`,
    create: '/products',
    update: (id: string) => `/products/${id}`,
    delete: (id: string) => `/products/${id}`,
    categories: '/products/categories',
  },
  
  orders: {
    list: '/orders',
    detail: (id: string) => `/orders/${id}`,
    create: '/orders',
    update: (id: string) => `/orders/${id}`,
    cancel: (id: string) => `/orders/${id}/cancel`,
    stats: '/orders/stats',
  },
  
  // Forum integration
  forum: {
    stats: '/forum/stats',
    posts: '/forum/posts',
    categories: '/forum/categories',
    users: '/forum/users',
    moderation: '/forum/moderation',
  },

  // Dashboard
  dashboard: {
    overview: '/dashboard/overview',
    analytics: '/dashboard/analytics',
    activities: '/dashboard/activities',
    notifications: '/dashboard/notifications',
  },
  
  // Settings
  settings: {
    general: '/settings/general',
    appearance: '/settings/appearance',
    email: '/settings/email',
    integrations: '/settings/integrations',
  },
};

// Helper function to construct full API URL
export function getApiUrl(endpoint: string): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr/api';
  return `${baseUrl}${endpoint}`;
}

// Helper function to construct app URL
export function getAppUrl(app: keyof typeof appsConfig, path?: string): string {
  const appConfig = appsConfig[app];
  return path ? `${appConfig.url}${path}` : appConfig.url;
}