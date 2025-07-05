export const API_ENDPOINTS = {
  // 인증 관련 (새 SSO/JWT 시스템)
  AUTH: {
    // 새 JWT 인증 엔드포인트
    LOGIN: '/api/v1/business/auth/login',
    REFRESH: '/api/v1/business/auth/refresh', 
    LOGOUT: '/api/v1/business/auth/logout',
    ME: '/api/v1/business/auth/me',
    
    // 레거시 엔드포인트 (하위 호환성)
    LEGACY_REGISTER: '/api/auth/register',
    LEGACY_LOGIN: '/api/auth/login',
    LEGACY_ME: '/api/auth/me',
    LEGACY_LOGOUT: '/api/auth/logout',
  },

  // 상품 관련
  PRODUCTS: {
    LIST: '/api/products',
    DETAIL: (id: string) => `/api/products/${id}`,
    CREATE: '/api/products',
    UPDATE: (id: string) => `/api/products/${id}`,
    DELETE: (id: string) => `/api/products/${id}`,
  },

  // 관리자 관련
  ADMIN: {
    STATS: '/api/admin/stats',
    APPROVE: (id: string) => `/api/admin/approve/${id}`,
    USERS: '/api/admin/users',
  },

  // 포럼 관련
  FORUM: {
    POSTS: '/api/forum/posts',
    POST: (id: string) => `/api/forum/posts/${id}`,
    COMMENTS: (postId: string) => `/api/forum/posts/${postId}/comments`,
  },

  // 펀딩 관련
  FUNDING: {
    LIST: '/api/funding',
    DETAIL: (id: string) => `/api/funding/${id}`,
    CREATE: '/api/funding',
    UPDATE: (id: string) => `/api/funding/${id}`,
    PARTICIPATE: (id: string) => `/api/funding/${id}/participate`,
  },

  // 디지털 사이니지 관련
  SIGNAGE: {
    LIST: '/api/signage',
    DETAIL: (id: string) => `/api/signage/${id}`,
    CREATE: '/api/signage',
    UPDATE: (id: string) => `/api/signage/${id}`,
    SCHEDULE: (id: string) => `/api/signage/${id}/schedule`,
  },
} as const; 