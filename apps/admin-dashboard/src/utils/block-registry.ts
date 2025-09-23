/**
 * 중앙집중식 블록 등록 시스템
 * 모든 블록의 등록, 매핑, 설정을 한 곳에서 관리
 */

import { ComponentType } from 'react'
import ParagraphBlock from '../components/editor/blocks/ParagraphBlock'
import EnhancedHeadingBlock from '../components/editor/blocks/EnhancedHeadingBlock'
import ListBlock from '../components/editor/blocks/ListBlock'
import CodeBlock from '../components/editor/blocks/CodeBlock'
import QuoteBlock from '../components/editor/blocks/QuoteBlock'
import EnhancedImageBlock from '../components/editor/blocks/EnhancedImageBlock'
import ButtonBlock from '../components/editor/blocks/ButtonBlock'
import ColumnsBlock from '../components/editor/blocks/ColumnsBlock'

// 블록 카테고리 정의
export enum BlockCategory {
  TEXT = 'text',
  MEDIA = 'media',
  DESIGN = 'design',
  COMMERCE = 'commerce',
  SITE = 'site',
  DATA = 'data',
  EMBED = 'embed',
  DYNAMIC = 'dynamic'
}

// 블록 상태 정의
export enum BlockStatus {
  READY = 'ready',        // 구현 완료, 사용 가능
  BETA = 'beta',          // 베타 테스트 중
  PLANNED = 'planned',    // 구현 예정
  DEPRECATED = 'deprecated' // 사용 중단 예정
}

// 블록 메타데이터 인터페이스
export interface BlockMetadata {
  id: string                    // 고유 식별자
  name: string                  // 표시 이름
  description: string           // 설명
  category: BlockCategory       // 카테고리
  status: BlockStatus          // 상태
  icon?: any                   // Lucide 아이콘
  keywords?: string[]          // 검색 키워드
  supports?: {                 // 지원 기능
    align?: boolean
    color?: boolean
    className?: boolean
    anchor?: boolean
  }
  attributes?: Record<string, any> // 기본 속성
}

// 블록 정의 인터페이스
export interface BlockDefinition extends BlockMetadata {
  component?: ComponentType<any>  // React 컴포넌트
  edit?: ComponentType<any>       // 편집 컴포넌트
  save?: ComponentType<any>       // 저장 컴포넌트
  transforms?: any                // 변환 규칙
  deprecated?: any[]              // 이전 버전 호환성
}

// 블록 레지스트리 클래스
class BlockRegistry {
  private blocks: Map<string, BlockDefinition> = new Map()
  private aliases: Map<string, string> = new Map() // 별칭 지원

  // 블록 등록
  register(block: BlockDefinition) {
    // 기본 ID로 등록
    this.blocks.set(block.id, block)
    
    // core/ 프리픽스 별칭 자동 생성
    if (!block.id.startsWith('core/')) {
      this.aliases.set(`core/${block.id}`, block.id)
    } else {
      const withoutCore = block.id.replace('core/', '')
      this.aliases.set(withoutCore, block.id)
    }
    
    // Block registered: ${block.id} (${block.status})
  }

  // 블록 가져오기
  get(id: string): BlockDefinition | undefined {
    // 직접 조회
    if (this.blocks.has(id)) {
      return this.blocks.get(id)
    }
    
    // 별칭으로 조회
    const aliasedId = this.aliases.get(id)
    if (aliasedId) {
      return this.blocks.get(aliasedId)
    }
    
    return undefined
  }

  // 모든 블록 가져오기
  getAll(): BlockDefinition[] {
    return Array.from(this.blocks.values())
  }

  // 카테고리별 블록 가져오기
  getByCategory(category: BlockCategory): BlockDefinition[] {
    return this.getAll().filter(block => block.category === category)
  }

  // 상태별 블록 가져오기
  getByStatus(status: BlockStatus): BlockDefinition[] {
    return this.getAll().filter(block => block.status === status)
  }

  // 사용 가능한 블록만 가져오기
  getAvailable(): BlockDefinition[] {
    return this.getAll().filter(block => 
      block.status === BlockStatus.READY || 
      block.status === BlockStatus.BETA
    )
  }

  // 블록 컴포넌트 가져오기
  getComponent(id: string): ComponentType<any> | undefined {
    const block = this.get(id)
    return block?.component
  }

  // 블록 존재 확인
  has(id: string): boolean {
    return this.blocks.has(id) || this.aliases.has(id)
  }

  // 검색
  search(query: string): BlockDefinition[] {
    const lowercaseQuery = query.toLowerCase()
    return this.getAvailable().filter(block => 
      block.name.toLowerCase().includes(lowercaseQuery) ||
      block.description.toLowerCase().includes(lowercaseQuery) ||
      block.keywords?.some(keyword => 
        keyword.toLowerCase().includes(lowercaseQuery)
      )
    )
  }

  // 통계
  getStats() {
    const all = this.getAll()
    return {
      total: all.length,
      ready: all.filter(b => b.status === BlockStatus.READY).length,
      beta: all.filter(b => b.status === BlockStatus.BETA).length,
      planned: all.filter(b => b.status === BlockStatus.PLANNED).length,
      deprecated: all.filter(b => b.status === BlockStatus.DEPRECATED).length,
      byCategory: Object.values(BlockCategory).reduce((acc, cat) => {
        acc[cat] = this.getByCategory(cat).length
        return acc
      }, {} as Record<BlockCategory, number>)
    }
  }
}

// 싱글톤 인스턴스
export const blockRegistry = new BlockRegistry()

// ==========================================
// 블록 등록 (중앙 집중 관리)
// ==========================================

// TEXT 카테고리
blockRegistry.register({
  id: 'paragraph',
  name: 'Paragraph',
  description: 'Add a text paragraph',
  category: BlockCategory.TEXT,
  status: BlockStatus.READY,
  component: SimplifiedParagraphBlock,
  keywords: ['text', 'writing', 'content'],
  supports: {
    align: true,
    color: true,
    className: true
  }
})

blockRegistry.register({
  id: 'heading',
  name: 'Heading',
  description: 'Add a heading (H1-H6)',
  category: BlockCategory.TEXT,
  status: BlockStatus.READY,
  component: EnhancedHeadingBlock,
  keywords: ['title', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  supports: {
    align: true,
    color: true,
    anchor: true
  }
})

blockRegistry.register({
  id: 'list',
  name: 'List',
  description: 'Create ordered or unordered lists',
  category: BlockCategory.TEXT,
  status: BlockStatus.READY,
  component: SimplifiedListBlock,
  keywords: ['bullet', 'numbered', 'items']
})

blockRegistry.register({
  id: 'quote',
  name: 'Quote',
  description: 'Add a quote or citation',
  category: BlockCategory.TEXT,
  status: BlockStatus.READY,
  component: QuoteBlock,
  keywords: ['blockquote', 'citation', 'testimonial']
})

blockRegistry.register({
  id: 'code',
  name: 'Code',
  description: 'Display code with syntax highlighting',
  category: BlockCategory.TEXT,
  status: BlockStatus.READY,
  component: CodeBlock,
  keywords: ['programming', 'syntax', 'snippet']
})

// MEDIA 카테고리
blockRegistry.register({
  id: 'image',
  name: 'Image',
  description: 'Upload or select an image',
  category: BlockCategory.MEDIA,
  status: BlockStatus.READY,
  component: EnhancedImageBlock,
  keywords: ['photo', 'picture', 'media'],
  supports: {
    align: true
  }
})

blockRegistry.register({
  id: 'video',
  name: 'Video',
  description: 'Embed a video file or URL',
  category: BlockCategory.MEDIA,
  status: BlockStatus.PLANNED,
  keywords: ['movie', 'film', 'mp4', 'youtube']
})

blockRegistry.register({
  id: 'audio',
  name: 'Audio',
  description: 'Embed an audio file',
  category: BlockCategory.MEDIA,
  status: BlockStatus.PLANNED,
  keywords: ['music', 'sound', 'mp3', 'podcast']
})

blockRegistry.register({
  id: 'gallery',
  name: 'Gallery',
  description: 'Display multiple images in a gallery',
  category: BlockCategory.MEDIA,
  status: BlockStatus.PLANNED,
  keywords: ['photos', 'images', 'grid', 'carousel']
})

// DESIGN 카테고리
blockRegistry.register({
  id: 'button',
  name: 'Button',
  description: 'Add a clickable button',
  category: BlockCategory.DESIGN,
  status: BlockStatus.READY,
  component: ButtonBlock,
  keywords: ['cta', 'link', 'action'],
  supports: {
    align: true,
    color: true
  }
})

blockRegistry.register({
  id: 'columns',
  name: 'Columns',
  description: 'Create multi-column layouts',
  category: BlockCategory.DESIGN,
  status: BlockStatus.READY,
  component: ColumnsBlock,
  keywords: ['layout', 'grid', 'responsive']
})

blockRegistry.register({
  id: 'spacer',
  name: 'Spacer',
  description: 'Add vertical spacing',
  category: BlockCategory.DESIGN,
  status: BlockStatus.PLANNED,
  keywords: ['space', 'margin', 'gap', 'padding']
})

blockRegistry.register({
  id: 'separator',
  name: 'Separator',
  description: 'Add a horizontal line',
  category: BlockCategory.DESIGN,
  status: BlockStatus.PLANNED,
  keywords: ['divider', 'line', 'hr', 'break']
})

blockRegistry.register({
  id: 'group',
  name: 'Group',
  description: 'Group blocks together',
  category: BlockCategory.DESIGN,
  status: BlockStatus.BETA,
  keywords: ['container', 'wrapper', 'section']
})

// DATA 카테고리
blockRegistry.register({
  id: 'table',
  name: 'Table',
  description: 'Display data in a table format',
  category: BlockCategory.DATA,
  status: BlockStatus.PLANNED,
  keywords: ['data', 'grid', 'spreadsheet', 'rows', 'columns']
})

// EMBED 카테고리
blockRegistry.register({
  id: 'embed',
  name: 'Embed',
  description: 'Embed content from external sources',
  category: BlockCategory.EMBED,
  status: BlockStatus.PLANNED,
  keywords: ['youtube', 'twitter', 'instagram', 'iframe']
})

// COMMERCE 카테고리
blockRegistry.register({
  id: 'product',
  name: 'Product',
  description: 'Display a single product',
  category: BlockCategory.COMMERCE,
  status: BlockStatus.PLANNED,
  keywords: ['shop', 'ecommerce', 'item', 'sale']
})

blockRegistry.register({
  id: 'product-grid',
  name: 'Product Grid',
  description: 'Display products in a grid layout',
  category: BlockCategory.COMMERCE,
  status: BlockStatus.PLANNED,
  keywords: ['shop', 'catalog', 'products', 'grid']
})

blockRegistry.register({
  id: 'add-to-cart',
  name: 'Add to Cart',
  description: 'Add to cart button',
  category: BlockCategory.COMMERCE,
  status: BlockStatus.PLANNED,
  keywords: ['shop', 'buy', 'purchase', 'cart']
})

// SITE 카테고리
blockRegistry.register({
  id: 'site-logo',
  name: 'Site Logo',
  description: 'Display your site logo',
  category: BlockCategory.SITE,
  status: BlockStatus.PLANNED,
  keywords: ['brand', 'identity', 'header']
})

blockRegistry.register({
  id: 'navigation',
  name: 'Navigation',
  description: 'Site navigation menu',
  category: BlockCategory.SITE,
  status: BlockStatus.PLANNED,
  keywords: ['menu', 'nav', 'links', 'header']
})

// ==========================================
// 헬퍼 함수
// ==========================================

/**
 * 블록 ID로 컴포넌트 가져오기
 */
export function getBlockComponent(blockId: string): ComponentType<any> | null {
  const component = blockRegistry.getComponent(blockId)
  if (!component) {
    // Block component not found for: ${blockId}
    return null
  }
  return component
}

/**
 * 사용 가능한 블록 목록 가져오기
 */
export function getAvailableBlocks(): BlockDefinition[] {
  return blockRegistry.getAvailable()
}

/**
 * 카테고리별 블록 그룹 가져오기
 */
export function getBlocksByCategory(): Record<BlockCategory, BlockDefinition[]> {
  return Object.values(BlockCategory).reduce((acc, category) => {
    acc[category] = blockRegistry.getByCategory(category)
    return acc
  }, {} as Record<BlockCategory, BlockDefinition[]>)
}

/**
 * 블록 통계 가져오기
 */
export function getBlockStats() {
  return blockRegistry.getStats()
}

// 초기화 시 통계 출력
// Block Registry Initialized with stats

export default blockRegistry