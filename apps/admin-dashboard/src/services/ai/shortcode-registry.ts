/**
 * Shortcode Registry
 * 숏코드 중앙 관리 레지스트리
 *
 * 새 숏코드를 추가하려면 이 파일에 등록하면 AI가 자동으로 인식합니다.
 */

export interface ShortcodeConfig {
  description: string;
  attributes?: Record<string, {
    type: 'string' | 'number' | 'boolean';
    required?: boolean;
    default?: any;
    options?: any[];
    description?: string;
  }>;
  category?: string;
  requiresAuth?: boolean;
}

/**
 * 일반 컨텐츠 숏코드 레지스트리
 */
export const contentShortcodes: Record<string, ShortcodeConfig> = {
  // WordPress 기본 숏코드
  'gallery': {
    description: '이미지 갤러리를 표시합니다',
    category: 'Media',
    attributes: {
      ids: {
        type: 'string',
        required: true,
        description: '쉼표로 구분된 이미지 ID 목록 (예: "1,2,3")'
      },
      columns: {
        type: 'number',
        default: 3,
        description: '갤러리 열 개수'
      },
      size: {
        type: 'string',
        default: 'medium',
        options: ['thumbnail', 'medium', 'large', 'full'],
        description: '이미지 크기'
      }
    }
  },

  'video': {
    description: 'YouTube, Vimeo 등 비디오를 임베드합니다',
    category: 'Media',
    attributes: {
      url: {
        type: 'string',
        required: true,
        description: '비디오 URL'
      },
      width: {
        type: 'number',
        default: 560,
        description: '비디오 너비 (픽셀)'
      },
      height: {
        type: 'number',
        default: 315,
        description: '비디오 높이 (픽셀)'
      }
    }
  },

  'recent_posts': {
    description: '최근 게시물 목록을 표시합니다',
    category: 'Content',
    attributes: {
      limit: {
        type: 'number',
        default: 5,
        description: '표시할 게시물 수'
      },
      category: {
        type: 'string',
        required: false,
        description: '특정 카테고리 필터 (선택사항)'
      }
    }
  },

  'author': {
    description: '작성자 정보를 표시합니다',
    category: 'Content',
    attributes: {
      id: {
        type: 'string',
        required: true,
        description: '작성자 ID 또는 사용자명'
      }
    }
  }
};

/**
 * E-commerce 숏코드 레지스트리
 */
export const ecommerceShortcodes: Record<string, ShortcodeConfig> = {
  'product': {
    description: '단일 상품을 표시합니다',
    category: 'E-commerce',
    attributes: {
      id: {
        type: 'string',
        required: true,
        description: '상품 ID'
      },
      variant: {
        type: 'string',
        default: 'card',
        options: ['card', 'list', 'compact'],
        description: '표시 스타일'
      }
    }
  },

  'product_grid': {
    description: '상품 그리드를 표시합니다',
    category: 'E-commerce',
    attributes: {
      category: {
        type: 'string',
        required: false,
        description: '카테고리 필터'
      },
      limit: {
        type: 'number',
        default: 8,
        description: '표시할 상품 수'
      },
      columns: {
        type: 'number',
        default: 4,
        options: [2, 3, 4, 5, 6],
        description: '그리드 열 개수'
      }
    }
  },

  'add_to_cart': {
    description: '장바구니 추가 버튼을 표시합니다',
    category: 'E-commerce',
    attributes: {
      id: {
        type: 'string',
        required: true,
        description: '상품 ID'
      },
      text: {
        type: 'string',
        default: '장바구니에 담기',
        description: '버튼 텍스트'
      }
    }
  },

  'featured_products': {
    description: '추천 상품 목록을 표시합니다',
    category: 'E-commerce',
    attributes: {
      limit: {
        type: 'number',
        default: 4,
        description: '표시할 상품 수'
      }
    }
  }
};

/**
 * Forms 숏코드 레지스트리
 */
export const formShortcodes: Record<string, ShortcodeConfig> = {
  'form': {
    description: '폼을 삽입합니다',
    category: 'Forms',
    attributes: {
      id: {
        type: 'string',
        required: true,
        description: '폼 ID'
      }
    }
  },

  'view': {
    description: '데이터 뷰를 표시합니다',
    category: 'Forms',
    attributes: {
      id: {
        type: 'string',
        required: true,
        description: '뷰 ID'
      }
    }
  }
};

/**
 * 모든 일반 숏코드 통합
 */
export const generalShortcodes: Record<string, ShortcodeConfig> = {
  ...contentShortcodes,
  ...ecommerceShortcodes,
  ...formShortcodes
};

/**
 * 숏코드 레지스트리에서 메타데이터 추출
 */
export function extractFromRegistry(registry: Record<string, ShortcodeConfig>) {
  return Object.entries(registry).map(([name, config]) => {
    const attrNames = Object.keys(config.attributes || {});

    // 예제 생성
    let example = `[${name}`;
    if (attrNames.length > 0) {
      const exampleAttrs = attrNames.slice(0, 2).map(attr => {
        const attrConfig = config.attributes![attr];
        const defaultValue = attrConfig.default ||
                           (attrConfig.type === 'string' ? 'value' :
                            attrConfig.type === 'number' ? '1' : 'true');
        return `${attr}="${defaultValue}"`;
      }).join(' ');
      example += ` ${exampleAttrs}`;
    }
    example += ']';

    return {
      name,
      description: config.description,
      attributes: attrNames,
      example,
      category: config.category || 'Other',
      requiresAuth: config.requiresAuth || false
    };
  });
}

/**
 * 새 숏코드 등록 (동적 확장)
 */
const dynamicShortcodes: Record<string, ShortcodeConfig> = {};

export function registerShortcode(name: string, config: ShortcodeConfig) {
  dynamicShortcodes[name] = config;
  // Shortcode registered successfully
}

export function getAllRegisteredShortcodes(): Record<string, ShortcodeConfig> {
  return {
    ...generalShortcodes,
    ...dynamicShortcodes
  };
}

/**
 * 숏코드 정보 조회
 */
export function getShortcodeConfig(name: string): ShortcodeConfig | undefined {
  return getAllRegisteredShortcodes()[name];
}

/**
 * 카테고리별 숏코드 목록
 */
export function getShortcodesByCategory(category: string) {
  const allShortcodes = getAllRegisteredShortcodes();
  return Object.entries(allShortcodes)
    .filter(([_, config]) => config.category === category)
    .map(([name]) => name);
}
