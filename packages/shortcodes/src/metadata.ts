/**
 * Shortcode Metadata Registry
 * Phase P0-E: Single Source of Truth for AI-facing shortcode metadata
 *
 * This file contains metadata ONLY (no React components).
 * Components are registered separately in each app.
 *
 * Updated to match actual ShortcodeDefinition[] exports in main-site.
 */

export interface ShortcodeMetadata {
  name: string;
  description: string;
  category: string;
  parameters?: Record<string, {
    type: 'string' | 'number' | 'boolean';
    required?: boolean;
    default?: any;
    description?: string;
    options?: any[];
  }>;
  examples?: string[];
  tags?: string[];
  aiPrompts?: string[];
  requiresAuth?: boolean;
  version?: string;
}

/**
 * All shortcode metadata for AI/Registry consumption
 * Phase P0-E: Updated to match actual ShortcodeDefinition[] exports (main-site)
 */
export const shortcodeMetadata: ShortcodeMetadata[] = [
  // E-commerce shortcodes
  {
    name: 'product_grid',
    description: '상품 그리드를 표시합니다',
    category: 'ecommerce',
    parameters: {
      category: { type: 'string', description: '카테고리 필터' },
      limit: { type: 'number', default: 12, description: '표시할 상품 수' },
      columns: { type: 'number', default: 4, description: '그리드 컬럼 수' },
      featured: { type: 'boolean', default: false, description: '추천 상품만 표시' },
      orderby: { type: 'string', default: 'date', description: '정렬 기준' },
      order: { type: 'string', default: 'desc', description: '정렬 순서' },
    },
    examples: ['[product_grid]', '[product_grid limit="12" columns="3"]'],
    tags: ['상품', 'grid', 'product'],
    aiPrompts: ['상품을 그리드로 표시할 때', '상품 목록이 필요할 때'],
    version: '1.0.0',
  },
  {
    name: 'featured_products',
    description: '추천 상품 목록을 표시합니다',
    category: 'ecommerce',
    parameters: {
      limit: { type: 'number', default: 4, description: '표시할 상품 수' },
    },
    examples: ['[featured_products]', '[featured_products limit="6"]'],
    tags: ['추천상품', 'featured', 'product'],
    aiPrompts: ['추천 상품을 표시할 때', '특별 상품을 강조할 때'],
    version: '1.0.0',
  },
  {
    name: 'product_carousel',
    description: '상품 캐러셀을 표시합니다',
    category: 'ecommerce',
    parameters: {
      category: { type: 'string', description: '카테고리 필터' },
      limit: { type: 'number', default: 10, description: '표시할 상품 수' },
      autoplay: { type: 'boolean', default: true, description: '자동 재생' },
      title: { type: 'string', description: '캐러셀 제목' },
    },
    examples: ['[product_carousel]', '[product_carousel limit="10" autoplay="true"]'],
    tags: ['상품', 'carousel', 'slider'],
    aiPrompts: ['상품을 캐러셀로 표시할 때', '슬라이더로 상품을 보여줄 때'],
    version: '1.0.0',
  },
  {
    name: 'product_categories',
    description: '상품 카테고리를 표시합니다',
    category: 'ecommerce',
    parameters: {
      show_count: { type: 'boolean', default: true, description: '상품 수 표시' },
      hide_empty: { type: 'boolean', default: false, description: '빈 카테고리 숨김' },
      columns: { type: 'number', default: 4, description: '그리드 컬럼 수' },
    },
    examples: ['[product_categories]', '[product_categories columns="3"]'],
    tags: ['카테고리', 'categories', 'product'],
    aiPrompts: ['상품 카테고리를 표시할 때', '카테고리 목록이 필요할 때'],
    version: '1.0.0',
  },
  {
    name: 'cart',
    description: '장바구니를 표시합니다',
    category: 'ecommerce',
    parameters: {},
    examples: ['[cart]'],
    tags: ['장바구니', 'cart'],
    aiPrompts: ['장바구니를 표시할 때', '장바구니 페이지가 필요할 때'],
    version: '1.0.0',
  },
  {
    name: 'checkout',
    description: '결제 페이지를 표시합니다',
    category: 'ecommerce',
    parameters: {},
    examples: ['[checkout]'],
    tags: ['결제', 'checkout', 'payment'],
    aiPrompts: ['결제 페이지가 필요할 때', '주문 결제를 할 때'],
    requiresAuth: true,
    version: '1.0.0',
  },
  {
    name: 'order_detail',
    description: '주문 상세를 표시합니다',
    category: 'ecommerce',
    parameters: {
      order_id: { type: 'string', description: '주문 ID (없으면 URL에서 가져옴)' },
    },
    examples: ['[order_detail]', '[order_detail order_id="123"]'],
    tags: ['주문', 'order', 'detail'],
    aiPrompts: ['주문 상세가 필요할 때', '주문 정보를 표시할 때'],
    requiresAuth: true,
    version: '1.0.0',
  },
  {
    name: 'my-orders',
    description: '내 주문 목록을 표시합니다',
    category: 'ecommerce',
    parameters: {},
    examples: ['[my-orders]'],
    tags: ['주문', 'order', 'list'],
    aiPrompts: ['내 주문 목록을 표시할 때', '주문 내역이 필요할 때'],
    requiresAuth: true,
    version: '1.0.0',
  },
  {
    name: 'wishlist',
    description: '위시리스트를 표시합니다',
    category: 'ecommerce',
    parameters: {},
    examples: ['[wishlist]'],
    tags: ['위시리스트', 'wishlist', 'favorite'],
    aiPrompts: ['위시리스트를 표시할 때', '찜한 상품을 볼 때'],
    requiresAuth: true,
    version: '1.0.0',
  },

  // Auth shortcodes
  {
    name: 'login',
    description: '로그인 폼을 표시합니다',
    category: 'auth',
    parameters: {
      redirect: { type: 'string', description: '로그인 후 리다이렉트 URL' },
    },
    examples: ['[login]', '[login redirect="/dashboard"]'],
    tags: ['로그인', 'auth', 'login'],
    aiPrompts: ['로그인 폼이 필요할 때', '사용자 인증이 필요할 때'],
    requiresAuth: false,
    version: '1.0.0',
  },
  {
    name: 'signup',
    description: '회원가입 폼을 표시합니다',
    category: 'auth',
    parameters: {
      redirect: { type: 'string', description: '가입 후 리다이렉트 URL' },
    },
    examples: ['[signup]', '[signup redirect="/welcome"]'],
    tags: ['회원가입', 'auth', 'register', 'signup'],
    aiPrompts: ['회원가입 폼이 필요할 때', '사용자 등록이 필요할 때'],
    requiresAuth: false,
    version: '1.0.0',
  },
  {
    name: 'account',
    description: '사용자 계정 정보를 표시합니다',
    category: 'auth',
    parameters: {},
    examples: ['[account]'],
    tags: ['계정', 'account', 'profile', 'mypage'],
    aiPrompts: ['계정 정보가 필요할 때', '마이페이지가 필요할 때'],
    requiresAuth: true,
    version: '1.0.0',
  },
  {
    name: 'social_login',
    description: '소셜 로그인 버튼을 표시합니다',
    category: 'auth',
    parameters: {},
    examples: ['[social_login]'],
    tags: ['소셜로그인', 'oauth', 'social'],
    aiPrompts: ['소셜 로그인이 필요할 때', 'OAuth 로그인이 필요할 때'],
    version: '1.0.0',
  },
  {
    name: 'find_id',
    description: 'ID 찾기 폼을 표시합니다',
    category: 'auth',
    parameters: {},
    examples: ['[find_id]'],
    tags: ['ID찾기', 'find', 'recover'],
    aiPrompts: ['ID 찾기 폼이 필요할 때', '아이디를 잊어버렸을 때'],
    version: '1.0.0',
  },
  {
    name: 'find_password',
    description: '비밀번호 찾기 폼을 표시합니다',
    category: 'auth',
    parameters: {},
    examples: ['[find_password]'],
    tags: ['비밀번호찾기', 'password', 'recover'],
    aiPrompts: ['비밀번호 찾기 폼이 필요할 때', '비밀번호를 잊어버렸을 때'],
    version: '1.0.0',
  },
  {
    name: 'business_register',
    description: '사업자 등록 폼을 표시합니다',
    category: 'auth',
    parameters: {},
    examples: ['[business_register]'],
    tags: ['사업자등록', 'business', 'register'],
    aiPrompts: ['사업자 등록 폼이 필요할 때', '기업 회원가입이 필요할 때'],
    version: '1.0.0',
  },

  // Dropshipping Dashboard shortcodes
  {
    name: 'customer_dashboard',
    description: '고객 대시보드를 표시합니다',
    category: 'dropshipping',
    parameters: {},
    examples: ['[customer_dashboard]'],
    tags: ['고객', 'customer', 'dashboard'],
    aiPrompts: ['고객 대시보드가 필요할 때', '구매자 관리 화면이 필요할 때'],
    requiresAuth: true,
    version: '1.0.0',
  },

  // Dropshipping Application shortcodes
  {
    name: 'supplier_application',
    description: '공급업체 신청 폼을 표시합니다',
    category: 'dropshipping',
    parameters: {},
    examples: ['[supplier_application]'],
    tags: ['공급업체', 'supplier', 'application'],
    aiPrompts: ['공급업체 신청 폼이 필요할 때', '공급자 등록이 필요할 때'],
    version: '1.0.0',
  },
  {
    name: 'seller_application',
    description: '판매자 신청 폼을 표시합니다',
    category: 'dropshipping',
    parameters: {},
    examples: ['[seller_application]'],
    tags: ['판매자', 'seller', 'application'],
    aiPrompts: ['판매자 신청 폼이 필요할 때', '판매자 등록이 필요할 때'],
    version: '1.0.0',
  },
  {
    name: 'partner_application',
    description: '파트너 신청 폼을 표시합니다',
    category: 'dropshipping',
    parameters: {},
    examples: ['[partner_application]'],
    tags: ['파트너', 'partner', 'application'],
    aiPrompts: ['파트너 신청 폼이 필요할 때', '파트너 등록이 필요할 때'],
    version: '1.0.0',
  },
];

/**
 * Get metadata by shortcode name
 */
export function getShortcodeMetadata(name: string): ShortcodeMetadata | undefined {
  return shortcodeMetadata.find((meta) => meta.name === name);
}

/**
 * Get all shortcodes by category
 */
export function getShortcodesByCategory(category: string): ShortcodeMetadata[] {
  return shortcodeMetadata.filter((meta) => meta.category === category);
}

/**
 * Get all categories
 */
export function getAllCategories(): string[] {
  const categories = new Set(shortcodeMetadata.map((meta) => meta.category));
  return Array.from(categories).sort();
}

/**
 * Get all shortcode names
 */
export function getAllShortcodeNames(): string[] {
  return shortcodeMetadata.map((meta) => meta.name).sort();
}
