/**
 * Shortcode Metadata Registry
 * Phase P0-B: Single Source of Truth for AI-facing shortcode metadata
 *
 * This file contains metadata ONLY (no React components).
 * Components are registered separately in each app.
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
 * Phase P0-B: Initial set (19 shortcodes from API Server + Admin Dashboard)
 */
export const shortcodeMetadata: ShortcodeMetadata[] = [
  // E-commerce shortcodes
  {
    name: 'products',
    description: '상품 목록을 표시합니다',
    category: 'ecommerce',
    parameters: {
      limit: {
        type: 'number',
        default: 10,
        description: '표시할 상품 수',
      },
      category: {
        type: 'string',
        description: '카테고리 슬러그',
      },
      featured: {
        type: 'boolean',
        default: false,
        description: '추천 상품만 표시',
      },
      sort: {
        type: 'string',
        default: 'date',
        description: '정렬 방식',
        options: ['date', 'price', 'name', 'popularity'],
      },
      columns: {
        type: 'number',
        default: 3,
        description: '열 수',
      },
    },
    examples: [
      '[products limit="6" columns="3"]',
      '[products category="electronics" featured="true"]',
      '[products sort="price" limit="4"]',
    ],
    tags: ['상품', '쇼핑', '목록'],
    aiPrompts: [
      '상품을 보여주고 싶을 때',
      '쇼핑몰 페이지를 만들 때',
      '추천 상품을 표시할 때',
    ],
    version: '1.0.0',
  },
  {
    name: 'product',
    description: '단일 상품을 표시합니다',
    category: 'ecommerce',
    parameters: {
      id: {
        type: 'string',
        required: true,
        description: '상품 ID',
      },
      variant: {
        type: 'string',
        default: 'card',
        options: ['card', 'list', 'compact'],
        description: '표시 스타일',
      },
    },
    examples: ['[product id="123"]', '[product id="456" variant="list"]'],
    tags: ['상품', 'product'],
    aiPrompts: ['특정 상품을 표시할 때'],
    version: '1.0.0',
  },
  {
    name: 'product_grid',
    description: '상품 그리드를 표시합니다',
    category: 'ecommerce',
    parameters: {
      category: {
        type: 'string',
        description: '카테고리 필터',
      },
      limit: {
        type: 'number',
        default: 8,
        description: '표시할 상품 수',
      },
      columns: {
        type: 'number',
        default: 4,
        options: [2, 3, 4, 5, 6],
        description: '그리드 열 개수',
      },
    },
    examples: ['[product_grid limit="12" columns="4"]'],
    tags: ['상품', 'grid'],
    aiPrompts: ['상품을 그리드로 표시할 때'],
    version: '1.0.0',
  },
  {
    name: 'add_to_cart',
    description: '장바구니 추가 버튼을 표시합니다',
    category: 'ecommerce',
    parameters: {
      id: {
        type: 'string',
        required: true,
        description: '상품 ID',
      },
      text: {
        type: 'string',
        default: '장바구니에 담기',
        description: '버튼 텍스트',
      },
    },
    examples: ['[add_to_cart id="123"]', '[add_to_cart id="456" text="구매하기"]'],
    tags: ['장바구니', 'cart'],
    aiPrompts: ['장바구니 버튼이 필요할 때'],
    version: '1.0.0',
  },
  {
    name: 'featured_products',
    description: '추천 상품 목록을 표시합니다',
    category: 'ecommerce',
    parameters: {
      limit: {
        type: 'number',
        default: 4,
        description: '표시할 상품 수',
      },
    },
    examples: ['[featured_products limit="6"]'],
    tags: ['추천상품', 'featured'],
    aiPrompts: ['추천 상품을 표시할 때'],
    version: '1.0.0',
  },
  {
    name: 'categories',
    description: '상품 카테고리 목록을 표시합니다',
    category: 'ecommerce',
    parameters: {
      show_count: {
        type: 'boolean',
        default: true,
        description: '상품 수 표시',
      },
      parent: {
        type: 'string',
        description: '부모 카테고리 슬러그',
      },
      hide_empty: {
        type: 'boolean',
        default: true,
        description: '빈 카테고리 숨기기',
      },
    },
    examples: ['[categories show_count="true"]', '[categories parent="electronics"]'],
    tags: ['카테고리', '분류'],
    aiPrompts: ['카테고리별로 상품을 분류하고 싶을 때'],
    version: '1.0.0',
  },

  // Content shortcodes
  {
    name: 'recent_posts',
    description: '최근 게시물을 표시합니다',
    category: 'content',
    parameters: {
      limit: {
        type: 'number',
        default: 5,
        description: '표시할 게시물 수',
      },
      category: {
        type: 'string',
        description: '특정 카테고리 필터 (선택사항)',
      },
      show_date: {
        type: 'boolean',
        default: true,
        description: '날짜 표시',
      },
      show_excerpt: {
        type: 'boolean',
        default: false,
        description: '요약 표시',
      },
    },
    examples: [
      '[recent_posts limit="3"]',
      '[recent_posts category="news" show_excerpt="true"]',
    ],
    tags: ['게시물', '블로그', '뉴스'],
    aiPrompts: ['최신 글을 보여주고 싶을 때'],
    version: '1.0.0',
  },
  {
    name: 'author',
    description: '작성자 정보를 표시합니다',
    category: 'content',
    parameters: {
      id: {
        type: 'string',
        required: true,
        description: '작성자 ID 또는 사용자명',
      },
    },
    examples: ['[author id="admin"]'],
    tags: ['작성자', 'author'],
    aiPrompts: ['작성자 정보가 필요할 때'],
    version: '1.0.0',
  },

  // Media shortcodes
  {
    name: 'gallery',
    description: '이미지 갤러리를 표시합니다',
    category: 'media',
    parameters: {
      ids: {
        type: 'string',
        required: true,
        description: '쉼표로 구분된 이미지 ID 목록 (예: "1,2,3")',
      },
      columns: {
        type: 'number',
        default: 3,
        description: '갤러리 열 개수',
      },
      size: {
        type: 'string',
        default: 'medium',
        options: ['thumbnail', 'medium', 'large', 'full'],
        description: '이미지 크기',
      },
      lightbox: {
        type: 'boolean',
        default: true,
        description: '라이트박스 사용',
      },
    },
    examples: ['[gallery ids="1,2,3,4" columns="2"]', '[gallery size="large" lightbox="true"]'],
    tags: ['갤러리', '이미지', '사진'],
    aiPrompts: ['여러 이미지를 보기 좋게 표시하고 싶을 때'],
    version: '1.0.0',
  },
  {
    name: 'video',
    description: 'YouTube, Vimeo 등 비디오를 임베드합니다',
    category: 'media',
    parameters: {
      url: {
        type: 'string',
        required: true,
        description: '비디오 URL',
      },
      width: {
        type: 'number',
        default: 560,
        description: '비디오 너비 (픽셀)',
      },
      height: {
        type: 'number',
        default: 315,
        description: '비디오 높이 (픽셀)',
      },
    },
    examples: ['[video url="https://youtube.com/watch?v=xxx"]'],
    tags: ['비디오', 'video', 'youtube'],
    aiPrompts: ['비디오를 추가할 때'],
    version: '1.0.0',
  },

  // Form shortcodes
  {
    name: 'form',
    description: '폼을 삽입합니다',
    category: 'forms',
    parameters: {
      id: {
        type: 'string',
        required: true,
        description: '폼 ID',
      },
    },
    examples: ['[form id="contact"]'],
    tags: ['폼', 'form'],
    aiPrompts: ['폼을 추가할 때'],
    version: '1.0.0',
  },
  {
    name: 'view',
    description: '데이터 뷰를 표시합니다',
    category: 'forms',
    parameters: {
      id: {
        type: 'string',
        required: true,
        description: '뷰 ID',
      },
    },
    examples: ['[view id="users"]'],
    tags: ['뷰', 'view', 'data'],
    aiPrompts: ['데이터 뷰가 필요할 때'],
    version: '1.0.0',
  },
  {
    name: 'contact_form',
    description: '연락처 폼을 표시합니다',
    category: 'forms',
    parameters: {
      title: {
        type: 'string',
        default: '문의하기',
        description: '폼 제목',
      },
      email: {
        type: 'string',
        required: true,
        description: '수신 이메일 주소',
      },
      fields: {
        type: 'string',
        default: 'name,email,message',
        description: '표시할 필드들',
      },
    },
    examples: [
      '[contact_form email="contact@example.com"]',
      '[contact_form title="견적 문의" fields="name,phone,company,message"]',
    ],
    tags: ['폼', '연락처', '문의'],
    aiPrompts: ['연락처나 문의 폼이 필요할 때'],
    version: '1.0.0',
  },

  // Social shortcodes
  {
    name: 'social_icons',
    description: '소셜 미디어 아이콘을 표시합니다',
    category: 'social',
    parameters: {
      platforms: {
        type: 'string',
        default: 'facebook,twitter,instagram',
        description: '플랫폼들 (쉼표로 구분)',
      },
      size: {
        type: 'string',
        default: 'medium',
        description: '아이콘 크기',
        options: ['small', 'medium', 'large'],
      },
      style: {
        type: 'string',
        default: 'default',
        description: '아이콘 스타일',
        options: ['default', 'rounded', 'square'],
      },
    },
    examples: [
      '[social_icons platforms="facebook,instagram,youtube"]',
      '[social_icons size="large" style="rounded"]',
    ],
    tags: ['소셜', 'SNS', '아이콘'],
    aiPrompts: ['소셜 미디어 링크를 제공하고 싶을 때'],
    version: '1.0.0',
  },

  // Auth shortcodes (main-site specific, included for completeness)
  {
    name: 'login',
    description: '로그인 폼을 표시합니다',
    category: 'auth',
    parameters: {
      redirect: {
        type: 'string',
        description: '로그인 후 리다이렉트 URL',
      },
    },
    examples: ['[login]', '[login redirect="/dashboard"]'],
    tags: ['로그인', 'auth'],
    aiPrompts: ['로그인 폼이 필요할 때'],
    requiresAuth: false,
    version: '1.0.0',
  },
  {
    name: 'signup',
    description: '회원가입 폼을 표시합니다',
    category: 'auth',
    parameters: {
      redirect: {
        type: 'string',
        description: '가입 후 리다이렉트 URL',
      },
    },
    examples: ['[signup]', '[signup redirect="/welcome"]'],
    tags: ['회원가입', 'auth', 'register'],
    aiPrompts: ['회원가입 폼이 필요할 때'],
    requiresAuth: false,
    version: '1.0.0',
  },
  {
    name: 'account',
    description: '사용자 계정 정보를 표시합니다',
    category: 'auth',
    parameters: {},
    examples: ['[account]'],
    tags: ['계정', 'account', 'profile'],
    aiPrompts: ['계정 정보가 필요할 때'],
    requiresAuth: true,
    version: '1.0.0',
  },
  {
    name: 'cart',
    description: '장바구니를 표시합니다',
    category: 'ecommerce',
    parameters: {},
    examples: ['[cart]'],
    tags: ['장바구니', 'cart'],
    aiPrompts: ['장바구니를 표시할 때'],
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
