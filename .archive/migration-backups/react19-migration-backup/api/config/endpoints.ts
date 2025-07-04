export const API_ENDPOINTS = {
  // 인증 관련
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    ME: '/api/auth/me',
    LOGOUT: '/api/auth/logout',
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