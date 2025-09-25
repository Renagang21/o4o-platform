/**
 * Route Helper Utilities
 * 라우트 경로를 일관성 있게 관리하기 위한 유틸리티
 */

export class RouteHelper {
  // API 버전
  private static readonly API_VERSION = 'v1';
  
  // Base paths
  private static readonly BASE_PATH = '/api';
  private static readonly VERSIONED_PATH = `/api/${RouteHelper.API_VERSION}`;
  
  /**
   * 버전이 있는 API 경로 생성
   */
  static versioned(path: string): string {
    // 이미 /api 또는 버전이 포함되어 있으면 그대로 반환
    if (path.startsWith('/api/')) {
      return path;
    }
    // /로 시작하지 않으면 추가
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    return `${this.VERSIONED_PATH}${path}`;
  }
  
  /**
   * 버전 없는 API 경로 생성 (하위 호환용)
   */
  static unversioned(path: string): string {
    // 이미 /api가 포함되어 있으면 그대로 반환
    if (path.startsWith('/api')) {
      return path;
    }
    // /로 시작하지 않으면 추가
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    return `${this.BASE_PATH}${path}`;
  }
  
  /**
   * 라우트 그룹 생성 헬퍼
   */
  static createRouteGroup(basePath: string) {
    return {
      // 버전이 있는 경로
      v1: (subPath = '') => RouteHelper.versioned(`${basePath}${subPath}`),
      // 버전 없는 경로
      base: (subPath = '') => RouteHelper.unversioned(`${basePath}${subPath}`),
      // 둘 다 반환 (하위 호환성)
      both: (subPath = '') => [
        RouteHelper.versioned(`${basePath}${subPath}`),
        RouteHelper.unversioned(`${basePath}${subPath}`)
      ]
    };
  }
}

/**
 * 표준 API 경로 정의
 */
export const API_ROUTES = {
  // Auth routes
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    VERIFY: '/auth/verify',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // User routes
  USERS: {
    LIST: '/users',
    GET: '/users/:id',
    CREATE: '/users',
    UPDATE: '/users/:id',
    DELETE: '/users/:id',
  },
  
  // Product routes
  PRODUCTS: {
    LIST: '/products',
    GET: '/products/:id',
    CREATE: '/products',
    UPDATE: '/products/:id',
    DELETE: '/products/:id',
    BULK: '/products/bulk',
  },
  
  // Order routes
  ORDERS: {
    LIST: '/orders',
    GET: '/orders/:id',
    CREATE: '/orders',
    UPDATE: '/orders/:id',
    DELETE: '/orders/:id',
    STATUS: '/orders/:id/status',
  },
  
  // Inventory routes
  INVENTORY: {
    LIST: '/inventory',
    STATS: '/inventory/stats',
    ADJUST: '/inventory/adjust',
    ALERTS: '/inventory/alerts',
  },
  
  // Payment routes
  PAYMENTS: {
    CREATE: '/payments/create',
    CONFIRM: '/payments/confirm',
    CANCEL: '/payments/cancel',
    REFUND: '/payments/refund',
    LIST: '/payments',
    GET: '/payments/:id',
    // Toss specific
    TOSS: {
      CREATE: '/payments/toss/create',
      CONFIRM: '/payments/toss/confirm',
      CANCEL: '/payments/toss/cancel',
      CONFIG: '/payments/toss/config',
      WEBHOOK: '/payments/toss/webhook',
    }
  },
  
  // Settings routes
  SETTINGS: {
    GET: '/settings',
    UPDATE: '/settings',
    GENERAL: '/settings/general',
    PAYMENT: '/settings/payment',
    SHIPPING: '/settings/shipping',
    EMAIL: '/settings/email',
  },
  
  // Health check
  HEALTH: '/health',
  
  // Admin routes
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    STATS: '/admin/stats',
    USERS: '/admin/users',
    SETTINGS: '/admin/settings',
  }
};

/**
 * 라우트 경로 검증
 */
export function validateRoutePath(path: string): boolean {
  // 경로는 /로 시작해야 함
  if (!path.startsWith('/')) {
    return false;
  }
  
  // 경로에 공백이 없어야 함
  if (path.includes(' ')) {
    return false;
  }
  
  // 이중 슬래시 없어야 함
  if (path.includes('//')) {
    return false;
  }
  
  return true;
}

/**
 * 라우트 파라미터 추출
 */
export function extractRouteParams(path: string): string[] {
  const params: string[] = [];
  const regex = /:(\w+)/g;
  let match;
  
  while ((match = regex.exec(path)) !== null) {
    params.push(match[1]);
  }
  
  return params;
}