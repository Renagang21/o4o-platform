/**
 * Block Registry Extractor
 * 블록 레지스트리에서 메타데이터를 추출하여 AI 프롬프트에 사용
 */

import { dropshippingShortcodes } from '@/components/shortcodes/dropshipping';
import { generalShortcodes, extractFromRegistry } from './shortcode-registry';

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
  category?: string;
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
 * 숏코드 메타데이터 추출 (동적)
 * 실제 등록된 숏코드를 스캔하여 추출
 */
export function extractShortcodesMetadata(): ShortcodeMetadata[] {
  const shortcodes: ShortcodeMetadata[] = [];

  // 1. 일반 숏코드 레지스트리에서 추출
  const generalShortcodesMetadata = extractFromRegistry(generalShortcodes);
  shortcodes.push(...generalShortcodesMetadata);

  // 2. Dropshipping 숏코드 (실제 레지스트리에서 추출)
  Object.entries(dropshippingShortcodes).forEach(([name, config]) => {
    const attrs = config.attributes || {};
    const attrNames = Object.keys(attrs);

    // 예제 생성
    let example = `[${name}`;
    if (attrNames.length > 0) {
      const exampleAttrs = attrNames.slice(0, 2).map(attr => {
        const attrConfig = attrs[attr];
        const defaultValue = attrConfig.default ||
                           (attrConfig.type === 'string' ? 'value' :
                            attrConfig.type === 'number' ? '1' : 'true');
        return `${attr}="${defaultValue}"`;
      }).join(' ');
      example += ` ${exampleAttrs}`;
    }
    example += ']';

    shortcodes.push({
      name,
      description: config.description || `${name} 숏코드`,
      attributes: attrNames,
      example,
      category: getShortcodeCategory(name)
    });
  });

  return shortcodes;
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
