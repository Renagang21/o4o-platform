// Configuration for external apps integration
export const appsConfig = {
  forum: {
    name: 'Forum',
    url: import.meta.env.VITE_FORUM_URL || 'https://forum.neture.co.kr',
    apiEndpoint: '/api/v1/forum',
    icon: 'MessageSquare',
    color: 'primary',
  },
  signage: {
    name: 'Digital Signage',
    url: import.meta.env.VITE_SIGNAGE_URL || 'https://signage.neture.co.kr',
    apiEndpoint: '/api/v1/signage',
    icon: 'Monitor',
    color: 'secondary',
  },
  crowdfunding: {
    name: 'Crowdfunding',
    url: import.meta.env.VITE_FUNDING_URL || 'https://funding.neture.co.kr',
    apiEndpoint: '/api/v1/crowdfunding',
    icon: 'DollarSign',
    color: 'success',
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
    login: '/v1/auth/login',
    logout: '/v1/auth/logout',
    refresh: '/v1/auth/refresh',
    me: '/v1/auth/me',
    ssoCheck: '/v1/auth/sso/check',
  },
  
  // Users
  users: {
    list: '/v1/users',
    detail: (id: string) => `/v1/users/${id}`,
    create: '/v1/users',
    update: (id: string) => `/v1/users/${id}`,
    delete: (id: string) => `/v1/users/${id}`,
    roles: '/v1/users/roles',
  },
  
  // E-commerce
  products: {
    list: '/v1/products',
    detail: (id: string) => `/v1/products/${id}`,
    create: '/v1/products',
    update: (id: string) => `/v1/products/${id}`,
    delete: (id: string) => `/v1/products/${id}`,
    categories: '/v1/products/categories',
  },
  
  orders: {
    list: '/v1/orders',
    detail: (id: string) => `/v1/orders/${id}`,
    create: '/v1/orders',
    update: (id: string) => `/v1/orders/${id}`,
    cancel: (id: string) => `/v1/orders/${id}/cancel`,
    stats: '/v1/orders/stats',
  },
  
  // Forum integration
  forum: {
    stats: '/v1/forum/stats',
    posts: '/v1/forum/posts',
    categories: '/v1/forum/categories',
    users: '/v1/forum/users',
    moderation: '/v1/forum/moderation',
  },
  
  // Signage integration
  signage: {
    stats: '/v1/signage/stats',
    displays: '/v1/signage/displays',
    content: '/v1/signage/content',
    schedules: '/v1/signage/schedules',
    playlists: '/v1/signage/playlists',
  },
  
  // Crowdfunding integration
  crowdfunding: {
    stats: '/v1/crowdfunding/stats',
    campaigns: '/v1/crowdfunding/campaigns',
    contributions: '/v1/crowdfunding/contributions',
    users: '/v1/crowdfunding/users',
    payouts: '/v1/crowdfunding/payouts',
  },
  
  // Dashboard
  dashboard: {
    overview: '/v1/dashboard/overview',
    analytics: '/v1/dashboard/analytics',
    activities: '/v1/dashboard/activities',
    notifications: '/v1/dashboard/notifications',
  },
  
  // Settings
  settings: {
    general: '/v1/settings/general',
    appearance: '/v1/settings/appearance',
    email: '/v1/settings/email',
    integrations: '/v1/settings/integrations',
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