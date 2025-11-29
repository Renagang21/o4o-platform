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
};
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
        detail: (id) => `/users/${id}`,
        create: '/users',
        update: (id) => `/users/${id}`,
        delete: (id) => `/users/${id}`,
        roles: '/users/roles',
    },
    // E-commerce
    products: {
        list: '/products',
        detail: (id) => `/products/${id}`,
        create: '/products',
        update: (id) => `/products/${id}`,
        delete: (id) => `/products/${id}`,
        categories: '/products/categories',
    },
    orders: {
        list: '/orders',
        detail: (id) => `/orders/${id}`,
        create: '/orders',
        update: (id) => `/orders/${id}`,
        cancel: (id) => `/orders/${id}/cancel`,
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
    // Signage integration
    signage: {
        stats: '/signage/stats',
        displays: '/signage/displays',
        content: '/signage/content',
        schedules: '/signage/schedules',
        playlists: '/signage/playlists',
    },
    // Crowdfunding integration
    crowdfunding: {
        stats: '/crowdfunding/stats',
        campaigns: '/crowdfunding/campaigns',
        contributions: '/crowdfunding/contributions',
        users: '/crowdfunding/users',
        payouts: '/crowdfunding/payouts',
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
export function getApiUrl(endpoint) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr/api';
    return `${baseUrl}${endpoint}`;
}
// Helper function to construct app URL
export function getAppUrl(app, path) {
    const appConfig = appsConfig[app];
    return path ? `${appConfig.url}${path}` : appConfig.url;
}
//# sourceMappingURL=apps.config.js.map