/**
 * Dynamic Shortcodes Registry
 * Export all dynamic shortcodes and register them
 */

export * from './types';

// Export API Service
export {
  DynamicShortcodeAPIService,
  CachedDynamicAPIService,
  dynamicAPI,
  cachedDynamicAPI
} from './api-service';

// Import all dynamic shortcode components
export { CPTListShortcode, cptListShortcodeDefinition } from './cpt-list';
export { CPTFieldShortcode, cptFieldShortcodeDefinition } from './cpt-field';
export { ACFFieldShortcode, acfFieldShortcodeDefinition } from './acf-field';
export { MetaFieldShortcode, metaFieldShortcodeDefinition } from './meta-field';

// Import registry and renderer from parent
import { ShortcodeRegistry } from '../types';

/**
 * Register all dynamic shortcodes
 */
export function registerDynamicShortcodes(registry: ShortcodeRegistry): void {
  // Import definitions
  import('./cpt-list').then(({ cptListShortcodeDefinition }) => {
    registry.register(cptListShortcodeDefinition);
  });
  import('./cpt-field').then(({ cptFieldShortcodeDefinition }) => {
    registry.register(cptFieldShortcodeDefinition);
  });
  import('./acf-field').then(({ acfFieldShortcodeDefinition }) => {
    registry.register(acfFieldShortcodeDefinition);
  });
  import('./meta-field').then(({ metaFieldShortcodeDefinition }) => {
    registry.register(metaFieldShortcodeDefinition);
  });


  // Dynamic shortcodes registered: cpt_list, cpt_field, acf_field, meta_field
}

/**
 * Get all dynamic shortcode definitions
 */
export async function getDynamicShortcodeDefinitions() {
  const [cptList, cptField, acfField, metaField] = await Promise.all([
    import('./cpt-list'),
    import('./cpt-field'),
    import('./acf-field'),
    import('./meta-field'),
  ]);

  return [
    cptList.cptListShortcodeDefinition,
    cptField.cptFieldShortcodeDefinition,
    acfField.acfFieldShortcodeDefinition,
    metaField.metaFieldShortcodeDefinition,
  ];
}

/**
 * Dynamic shortcode templates for ShortcodeBlock
 */
export const dynamicShortcodeTemplates = [
  {
    category: 'CPT Data',
    templates: [
      {
        name: '상품 목록 (그리드)',
        shortcode: '[cpt_list type="ds_product" count="6" template="grid" columns="3" show_thumbnail="true"]',
        description: '드롭쉬핑 상품을 3열 그리드로 표시',
      },
      {
        name: '공급자 목록',
        shortcode: '[cpt_list type="ds_supplier" count="10" template="list" show_meta="true"]',
        description: '공급자 목록을 리스트 형태로 표시',
      },
      {
        name: '최신 상품 카드',
        shortcode: '[cpt_list type="ds_product" count="4" template="card" orderby="date" order="DESC"]',
        description: '최신 상품 4개를 카드 형태로 표시',
      },
    ],
  },
  {
    category: 'CPT Fields',
    templates: [
      {
        name: '상품명',
        shortcode: '[cpt_field field="title"]',
        description: '현재 상품의 제목 표시',
      },
      {
        name: '상품 가격',
        shortcode: '[cpt_field field="price" format="currency"]',
        description: '가격을 원화 형식으로 표시',
      },
      {
        name: '작성일',
        shortcode: '[cpt_field field="date" format="date"]',
        description: '게시물 작성일 표시',
      },
      {
        name: '썸네일 이미지',
        shortcode: '[cpt_field field="featured_image"]',
        description: '대표 이미지 표시',
      },
    ],
  },
  {
    category: 'ACF Fields',
    templates: [
      {
        name: '커스텀 가격',
        shortcode: '[acf_field name="custom_price" format="currency"]',
        description: 'ACF 커스텀 가격 필드',
      },
      {
        name: '상품 갤러리',
        shortcode: '[acf_field name="product_gallery" type="gallery"]',
        description: 'ACF 갤러리 필드',
      },
      {
        name: '공급자 정보',
        shortcode: '[acf_field name="supplier_info" default="정보 없음"]',
        description: '공급자 정보 필드 (기본값 포함)',
      },
      {
        name: '재고 상태',
        shortcode: '[acf_field name="stock_status" wrapper="span" class="stock-badge"]',
        description: '재고 상태를 뱃지로 표시',
      },
    ],
  },
  {
    category: 'Meta Fields',
    templates: [
      {
        name: '재고 상태',
        shortcode: '[meta_field key="_stock_status" default="재고 확인 중"]',
        description: '워드프레스 메타 필드',
      },
      {
        name: '조회수',
        shortcode: '[meta_field key="_view_count" format="number"]',
        description: '조회수 메타 필드',
      },
      {
        name: '썸네일 ID',
        shortcode: '[meta_field key="_thumbnail_id"]',
        description: '썸네일 이미지 ID',
      },
    ],
  },
];

/**
 * Helper function to create context for dynamic shortcodes
 */
export function createDynamicContext(postId?: string, postType?: string, currentPost?: any) {
  return {
    postId,
    postType,
    currentPost,
    apiUrl: '/api',
    siteUrl: window.location.origin,
    currentPath: window.location.pathname,
  };
}