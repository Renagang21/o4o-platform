/**
 * Block Registry Extractor
 * 블록 레지스트리에서 메타데이터를 추출하여 AI 프롬프트에 사용
 */

export interface BlockMetadata {
  name: string;
  title: string;
  category: string;
  description: string;
  attributes: Record<string, any>;
  example?: string;
}

export interface ShortcodeMetadata {
  name: string;
  description: string;
  attributes?: string[];
  example: string;
}

/**
 * 블록 레지스트리에서 모든 블록 정보 추출
 */
export function extractBlocksMetadata(): BlockMetadata[] {
  const blocks: BlockMetadata[] = [];

  // WordPress 블록 레지스트리에서 추출
  if (window.wp?.blocks?.getBlockTypes) {
    const blockTypes = window.wp.blocks.getBlockTypes();

    blockTypes.forEach((block: any) => {
      blocks.push({
        name: block.name,
        title: block.title,
        category: block.category || 'common',
        description: block.description || '',
        attributes: block.attributes || {},
        example: generateBlockExample(block)
      });
    });
  }

  return blocks;
}

/**
 * 블록 예제 생성
 */
function generateBlockExample(block: any): string {
  const attrs = block.attributes || {};
  const exampleAttrs: Record<string, any> = {};

  // 기본값이 있는 속성들로 예제 생성
  Object.entries(attrs).forEach(([key, value]: [string, any]) => {
    if (value.default !== undefined) {
      exampleAttrs[key] = value.default;
    }
  });

  return JSON.stringify({
    type: block.name,
    attributes: exampleAttrs,
    content: getExampleContent(block.name)
  }, null, 2);
}

/**
 * 블록 타입별 예제 콘텐츠
 */
function getExampleContent(blockName: string): any {
  const examples: Record<string, any> = {
    'core/paragraph': { text: '단락 텍스트 내용' },
    'core/heading': { text: '제목', level: 2 },
    'core/list': { items: ['항목 1', '항목 2'], ordered: false },
    'core/image': { alt: '이미지 설명', caption: '캡션' },
    'core/button': { text: '버튼 텍스트', url: '#' },
    'core/quote': { text: '인용문', citation: '출처' },
    'core/code': { code: 'console.log("Hello")', language: 'javascript' },
    'core/columns': { columns: [] },
    'core/separator': {},
    'core/spacer': { height: 50 },
    'core/gallery': { images: [] },
    'core/video': { caption: '비디오 설명' },
  };

  return examples[blockName] || {};
}

/**
 * 숏코드 메타데이터 추출
 */
export function extractShortcodesMetadata(): ShortcodeMetadata[] {
  return [
    // E-commerce 숏코드
    {
      name: 'product',
      description: '단일 상품 표시',
      attributes: ['id'],
      example: '[product id="123"]'
    },
    {
      name: 'product_grid',
      description: '상품 그리드 표시',
      attributes: ['category', 'limit', 'columns'],
      example: '[product_grid category="전자제품" limit="8" columns="4"]'
    },
    {
      name: 'add_to_cart',
      description: '장바구니 추가 버튼',
      attributes: ['id', 'text'],
      example: '[add_to_cart id="123" text="구매하기"]'
    },
    {
      name: 'featured_products',
      description: '추천 상품 표시',
      attributes: ['limit'],
      example: '[featured_products limit="4"]'
    },

    // Forms 숏코드
    {
      name: 'form',
      description: '폼 삽입',
      attributes: ['id'],
      example: '[form id="contact-form"]'
    },
    {
      name: 'view',
      description: '데이터 뷰 표시',
      attributes: ['id'],
      example: '[view id="submissions"]'
    },

    // Media 숏코드
    {
      name: 'video',
      description: '비디오 임베드 (YouTube, Vimeo 등)',
      attributes: ['url', 'width', 'height'],
      example: '[video url="https://youtube.com/watch?v=..." width="560" height="315"]'
    },
    {
      name: 'gallery',
      description: '이미지 갤러리',
      attributes: ['ids', 'columns', 'size'],
      example: '[gallery ids="1,2,3" columns="3" size="medium"]'
    },

    // Content 숏코드
    {
      name: 'recent_posts',
      description: '최근 게시물 표시',
      attributes: ['limit', 'category'],
      example: '[recent_posts limit="5" category="news"]'
    },
    {
      name: 'author',
      description: '작성자 정보 표시',
      attributes: ['id'],
      example: '[author id="john"]'
    },

    // Dropshipping 숏코드
    {
      name: 'partner_dashboard',
      description: '파트너 대시보드',
      attributes: [],
      example: '[partner_dashboard]'
    },
    {
      name: 'partner_products',
      description: '파트너 상품 목록',
      attributes: [],
      example: '[partner_products]'
    },
    {
      name: 'commission_dashboard',
      description: '커미션 대시보드',
      attributes: [],
      example: '[commission_dashboard]'
    },
    {
      name: 'admin_approval_queue',
      description: '관리자 승인 대기열',
      attributes: [],
      example: '[admin_approval_queue]'
    }
  ];
}

/**
 * AI 프롬프트용 블록 레퍼런스 생성
 */
export function generateBlocksReference(): string {
  const blocks = extractBlocksMetadata();

  const grouped = blocks.reduce((acc, block) => {
    const category = block.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(block);
    return acc;
  }, {} as Record<string, BlockMetadata[]>);

  let reference = '=== 사용 가능한 블록 (Gutenberg Blocks) ===\n\n';

  Object.entries(grouped).forEach(([category, categoryBlocks]) => {
    const categoryName = getCategoryDisplayName(category);
    reference += `${categoryName}:\n`;

    categoryBlocks.forEach(block => {
      reference += `- ${block.name}: ${block.description || block.title}\n`;
      if (block.example) {
        reference += `  예제: ${block.example}\n`;
      }
    });

    reference += '\n';
  });

  return reference;
}

/**
 * AI 프롬프트용 숏코드 레퍼런스 생성
 */
export function generateShortcodesReference(): string {
  const shortcodes = extractShortcodesMetadata();

  const grouped = shortcodes.reduce((acc, sc) => {
    const category = getShortcodeCategory(sc.name);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(sc);
    return acc;
  }, {} as Record<string, ShortcodeMetadata[]>);

  let reference = '=== 사용 가능한 숏코드 (Shortcodes) ===\n\n';

  Object.entries(grouped).forEach(([category, categoryShortcodes]) => {
    reference += `${category}:\n`;

    categoryShortcodes.forEach(sc => {
      reference += `- [${sc.name}]: ${sc.description}\n`;
      if (sc.attributes && sc.attributes.length > 0) {
        reference += `  속성: ${sc.attributes.join(', ')}\n`;
      }
      reference += `  예제: ${sc.example}\n`;
    });

    reference += '\n';
  });

  reference += '숏코드는 core/shortcode 블록으로 삽입:\n';
  reference += '{"type": "core/shortcode", "content": {"shortcode": "[product id=\\"123\\"]"}}\n';

  return reference;
}

/**
 * 카테고리 한글 이름
 */
function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    'text': '텍스트 블록',
    'media': '미디어 블록',
    'design': '디자인 블록',
    'layout': '레이아웃 블록',
    'widgets': '위젯 블록',
    'embed': '임베드 블록',
    'common': '일반 블록',
    'formatting': '서식 블록',
    'theme': '테마 블록'
  };

  return names[category] || category;
}

/**
 * 숏코드 카테고리 추론
 */
function getShortcodeCategory(name: string): string {
  if (name.includes('product') || name.includes('cart')) return 'E-commerce';
  if (name.includes('form') || name.includes('view')) return 'Forms';
  if (name.includes('video') || name.includes('gallery')) return 'Media';
  if (name.includes('post') || name.includes('author')) return 'Content';
  if (name.includes('partner') || name.includes('commission') || name.includes('admin')) return 'Dropshipping';
  return 'Other';
}

/**
 * 전체 레퍼런스 생성 (블록 + 숏코드)
 */
export function generateCompleteReference(): string {
  return generateBlocksReference() + '\n' + generateShortcodesReference();
}
