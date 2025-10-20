# 동적 블록 설계 판단 자료

> **작성일**: 2025-10-20
> **목적**: Post/CPT 동적 블록 개발을 위한 현재 아키텍처 분석 및 설계 방향 결정

---

## 📋 목차

1. [현재 아키텍처 분석](#-현재-아키텍처-분석)
2. [WordPress vs 커스텀 구현 비교](#-wordpress-vs-커스텀-구현-비교)
3. [핵심 발견사항](#-핵심-발견사항)
4. [설계 판단 및 권고사항](#-설계-판단-및-권고사항)
5. [구현 로드맵](#-구현-로드맵)

---

## 🏗️ 현재 아키텍처 분석

### 1. 편집기 구조 (GutenbergBlockEditor.tsx)

#### 핵심 특징
- **커스텀 React 기반 편집기**: WordPress Gutenberg UI 모방
- **폴리필 방식**: WordPress를 직접 사용하지 않고 시뮬레이션
- **독립적인 블록 시스템**: Block Registry로 자체 관리

#### 편집기 상태 관리
```typescript
// 블록 상태
const [blocks, setBlocks] = useState<Block[]>([])

// 블록 구조
interface Block {
  id: string
  type: string
  content: Record<string, unknown>
  attributes?: Record<string, unknown>
  innerBlocks?: Block[]
}
```

#### 주요 컴포넌트
- `GutenbergBlockEditor`: 메인 편집기 (3-column layout)
- `BlockWrapper`: 블록 래퍼 (드래그앤드롭, 선택 등)
- `DynamicRenderer`: 동적 블록 렌더링
- `GutenbergBlockInserter`: 블록 삽입 UI

---

### 2. 블록 시스템 아키텍처

#### Block Registry (중앙 집중식 관리)

**위치**: `apps/admin-dashboard/src/blocks/registry/BlockRegistry.ts`

**핵심 기능**:
```typescript
class BlockRegistry {
  // 블록 등록
  register(definition: BlockDefinition): void

  // 블록 조회
  get(name: string): BlockDefinition | undefined

  // 카테고리별 조회
  getByCategory(category: BlockCategory): BlockDefinition[]

  // 검색
  search(query: string): BlockSearchResult[]
}
```

**장점**:
- ✅ 중앙 집중식 블록 관리
- ✅ 타입 안전성 보장
- ✅ 검색 및 필터링 내장
- ✅ WordPress 독립적

**현재 등록된 블록**:
- Text: `paragraph`, `heading`, `quote`, `code`, `markdown`, `list`, `table`
- Media: `image`, `cover`, `gallery`, `slide`, `video`
- Layout: `columns`, `column`, `group`, `conditional`
- Design: `button`
- Embed: `youtube`, `file`
- Widget: `social`, `shortcode`

---

#### Block Definition 구조

**위치**: `apps/admin-dashboard/src/blocks/registry/types.ts`

```typescript
interface BlockDefinition {
  name: string                    // 'o4o/paragraph'
  title: string                   // 'Paragraph'
  category: BlockCategory         // 'text' | 'media' | 'layout' | ...
  icon: ReactElement | string
  description?: string
  keywords?: string[]
  component: BlockComponent       // React 컴포넌트
  attributes?: Record<string, AttributeSchema>
  supports?: BlockSupports
  parent?: string[]
  innerBlocksSettings?: InnerBlocksSettings
}
```

**블록 정의 예시**:
```typescript
// apps/admin-dashboard/src/blocks/definitions/button.tsx
export const buttonBlockDefinition: BlockDefinition = {
  name: 'o4o/button',
  title: 'Button',
  category: 'design',
  icon: <MousePointer2 className="w-5 h-5" />,
  description: 'Prompt visitors to take action...',
  component: ButtonBlock,
  attributes: {
    text: { type: 'string', default: 'Click me' },
    url: { type: 'string', default: '' },
    style: { type: 'string', default: 'fill' },
    // ...
  }
}
```

---

#### DynamicRenderer (동적 렌더링)

**위치**: `apps/admin-dashboard/src/blocks/registry/DynamicRenderer.tsx`

**핵심 로직**:
```typescript
export const DynamicRenderer: React.FC<Props> = ({ block, ... }) => {
  // 1. Block Registry에서 정의 조회
  const blockDefinition = blockRegistry.get(block.type)

  // 2. 컴포넌트 가져오기
  const BlockComponent = blockDefinition.component

  // 3. Props 준비
  const blockProps = {
    id: block.id,
    content: block.content,
    attributes: block.attributes,
    setAttributes: (attrs) => onChange(block.content, attrs),
    // ...
  }

  // 4. 렌더링 (Error Boundary 포함)
  return (
    <BlockErrorBoundary blockType={block.type}>
      <BlockComponent {...blockProps} />
    </BlockErrorBoundary>
  )
}
```

**장점**:
- ✅ 자동 블록 렌더링 (switch-case 불필요)
- ✅ Error Boundary 내장
- ✅ Legacy 블록 타입 지원
- ✅ 미등록 블록 fallback UI

---

### 3. WordPress 통합 방식

#### WordPress Polyfill

**위치**: `apps/admin-dashboard/src/utils/wordpress-initializer.ts`

**구현 방식**:
```typescript
// WordPress 글로벌 객체 시뮬레이션
window.wp = {
  element: { createElement, useState, ... },
  i18n: { __, _x, _n, ... },
  hooks: { addFilter, applyFilters, addAction, doAction },
  data: { select, dispatch, subscribe, ... },
  blocks: {
    registerBlockType: (name, settings) => {
      // 실제로는 사용 안 함
    },
    registerBlockVariation: () => {
      // 아직 빈 함수 (미구현)
    }
  }
}
```

**현재 상태**:
- ❌ **WordPress Gutenberg 직접 사용 안 함**
- ✅ **폴리필로 시뮬레이션**
- ⚠️ **registerBlockVariation 미구현** (빈 함수)
- ✅ **Block Registry로 자체 관리**

**시사점**:
→ **WordPress Query Loop Block을 직접 사용할 수 없음**
→ **커스텀 Query 블록을 직접 구현해야 함**

---

## ⚖️ WordPress vs 커스텀 구현 비교

### WordPress Query Loop Block 사용 (불가능)

#### 장점
- ✅ 공식 표준 블록
- ✅ 설계 자료 풍부
- ✅ Query Variation API 지원
- ✅ 커뮤니티 예제 많음

#### 단점
- ❌ **현재 아키텍처에서 사용 불가**
- ❌ WordPress Gutenberg 의존성 필요
- ❌ 폴리필로 완전 구현 어려움
- ❌ Block Registry와 통합 복잡

**결론**: ❌ 사용 불가능

---

### 커스텀 Query 블록 구현 (권장)

#### 장점
- ✅ **현재 Block Registry와 완벽 통합**
- ✅ WordPress 독립적
- ✅ 타입 안전성 보장
- ✅ 자유로운 커스터마이징
- ✅ 기존 QueryControls 재사용 가능

#### 단점
- ⚠️ 처음부터 설계 필요
- ⚠️ Query 로직 직접 구현

**결론**: ✅ 최적의 선택

---

## 🔍 핵심 발견사항

### 1. QueryControls 컴포넌트 발견 ⭐

**위치**: `apps/admin-dashboard/src/blocks/shared/QueryControls.tsx`

**현재 구현**:
```typescript
interface QueryControlsProps {
  attributes: any
  setAttributes: (attrs: any) => void
  postType?: string  // 기본값 'product'
}

// Query 파라미터
{
  perPage: number       // 페이지당 개수
  orderBy: string       // 정렬 기준 (date, title, price, sales, rating, ...)
  order: 'asc' | 'desc' // 정렬 순서
  search: string        // 검색어
  offset: number        // 오프셋

  // Product 전용
  featured: boolean
  onSale: boolean
  inStock: boolean
  minPrice: number
  maxPrice: number
}
```

**활용 가능성**:
- ✅ **이미 Product 중심 Query UI 구현됨**
- ✅ **Post/CPT로 확장 가능한 구조**
- ✅ **재사용 가능한 컴포넌트**

**아직 사용되지 않음**:
- 현재 어떤 블록에서도 import 안 됨
- 향후 동적 블록에서 활용 예정으로 보임

---

### 2. Block Category에 'dynamic' 존재 ⭐

**위치**: `apps/admin-dashboard/src/blocks/registry/types.ts`

```typescript
export type BlockCategory =
  | 'text'
  | 'media'
  | 'layout'
  | 'widgets'
  | 'embed'
  | 'design'
  | 'dynamic'  // ← 동적 블록을 위한 카테고리!
  | 'common';
```

**시사점**:
- ✅ **이미 동적 블록을 염두에 둔 설계**
- ✅ **Post/CPT Query 블록은 'dynamic' 카테고리로 등록**

---

### 3. Conditional Block 존재 (참고 자료) ⭐

**위치**: `apps/admin-dashboard/src/blocks/definitions/conditional.tsx`

**기능**:
- 조건에 따라 콘텐츠 표시/숨김
- WordPress Toolset 스타일

**구조**:
```typescript
{
  name: 'o4o/conditional',
  category: 'layout',
  attributes: {
    conditions: { type: 'array', default: [] },
    logicOperator: { type: 'string', default: 'AND' },
    showWhenMet: { type: 'boolean', default: true }
  },
  innerBlocksSettings: { /* InnerBlocks 지원 */ }
}
```

**활용**:
- ✅ **InnerBlocks 패턴 참고**
- ✅ **조건부 렌더링 로직 참고**
- ✅ **Query 블록과 조합 가능**

---

### 4. InnerBlocks 시스템 완벽 지원 ⭐

**타입 정의**:
```typescript
export interface InnerBlocksSettings {
  allowedBlocks?: string[]
  template?: unknown[]
  templateLock?: boolean | 'all' | 'insert'
  orientation?: 'vertical' | 'horizontal'
  renderAppender?: boolean | 'default' | 'button'
}

export interface BlockProps {
  innerBlocks?: unknown[]
  onInnerBlocksChange?: (innerBlocks: unknown[]) => void
  allowedBlocks?: string[]
  template?: unknown[]
  templateLock?: boolean | 'all' | 'insert'
}
```

**활용**:
- ✅ **Query 블록 내부에 Template 블록 구성 가능**
- ✅ **WordPress Query Loop + Post Template 패턴 구현 가능**

---

## 💡 설계 판단 및 권고사항

### 결론: 커스텀 Query 블록 구현 (Block Registry 기반)

#### 이유

1. **현재 아키텍처와 완벽 통합**
   - Block Registry 시스템 활용
   - WordPress 독립적
   - 타입 안전성 보장

2. **기존 자산 재사용**
   - QueryControls 컴포넌트 활용
   - InnerBlocks 시스템 활용
   - Conditional Block 패턴 참고

3. **확장성**
   - Post → CPT 확장 용이
   - 커스텀 필터 추가 자유로움
   - ACF 필드 통합 가능

---

### 권장 아키텍처

#### Phase 1: Post Query 블록 (3주)

```
📦 o4o/post-query (동적 블록 #1)
├── 역할: Post 목록 표시
├── 카테고리: 'dynamic'
├── InnerBlocks: o4o/post-template
├── Query 컨트롤: QueryControls 재사용
└── 구조:
    ├── Query 설정 (perPage, orderBy, order, search, offset)
    ├── 필터 (category, tag, author, status)
    └── Template (InnerBlocks로 구성)

📦 o4o/post-template (동적 블록 #2)
├── 역할: 개별 Post 렌더링 템플릿
├── 카테고리: 'dynamic'
├── parent: ['o4o/post-query']
├── InnerBlocks: 허용 (title, excerpt, image, meta, ...)
└── 구조:
    ├── Post Context 제공
    ├── Post 데이터 주입
    └── 커스텀 레이아웃 구성

📦 o4o/post-title (동적 블록 #3)
├── 역할: Post 제목 표시
├── 카테고리: 'dynamic'
├── parent: ['o4o/post-template']
└── 자동으로 현재 Post 제목 렌더링

📦 o4o/post-excerpt (동적 블록 #4)
├── 역할: Post 발췌문 표시
├── 카테고리: 'dynamic'
├── parent: ['o4o/post-template']
└── 자동으로 현재 Post 발췌문 렌더링

... (o4o/post-featured-image, o4o/post-meta 등)
```

---

#### Phase 2: CPT Query 블록 (2주)

```
📦 o4o/cpt-query (동적 블록 #8)
├── 역할: CPT 목록 표시
├── 카테고리: 'dynamic'
├── InnerBlocks: o4o/cpt-template
├── Query 컨트롤: QueryControls 확장
├── CPT 선택: postType 파라미터
└── 구조:
    ├── CPT 선택 UI
    ├── Query 설정 (Post와 동일)
    ├── CPT Taxonomy 필터
    └── Template (InnerBlocks로 구성)

📦 o4o/cpt-template (동적 블록 #9)
├── 역할: 개별 CPT 아이템 렌더링
├── 카테고리: 'dynamic'
├── parent: ['o4o/cpt-query']
├── InnerBlocks: 허용
└── 구조:
    ├── CPT Context 제공
    ├── ACF 필드 데이터 주입
    └── 커스텀 레이아웃 구성

📦 o4o/cpt-field (동적 블록 #10)
├── 역할: ACF 필드 표시
├── 카테고리: 'dynamic'
├── parent: ['o4o/cpt-template']
└── ACF get_field() 로직 구현
```

---

### 블록 등록 예시

#### Post Query Block

```typescript
// apps/admin-dashboard/src/blocks/definitions/post-query.tsx

import React from 'react';
import { Search } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import PostQueryBlock from '@/components/editor/blocks/PostQueryBlock';

export const postQueryBlockDefinition: BlockDefinition = {
  name: 'o4o/post-query',
  title: 'Post Query',
  category: 'dynamic',
  icon: <Search className="w-5 h-5" />,
  description: 'Display a list of posts with customizable query and layout.',
  keywords: ['post', 'query', 'loop', 'list', 'archive'],
  component: PostQueryBlock,

  attributes: {
    // Query settings
    query: {
      type: 'object',
      default: {
        postType: 'post',
        perPage: 10,
        orderBy: 'date',
        order: 'desc',
        offset: 0,
        search: '',
        // Filters
        category: [],
        tag: [],
        author: [],
        status: ['publish'],
      }
    },

    // Display settings
    layout: {
      type: 'string',
      default: 'list', // 'list' | 'grid' | 'custom'
    },
    columns: {
      type: 'number',
      default: 3,
    },
    gap: {
      type: 'number',
      default: 20,
    },
  },

  innerBlocksSettings: {
    allowedBlocks: ['o4o/post-template'],
    template: [
      ['o4o/post-template', {}, [
        ['o4o/post-title'],
        ['o4o/post-excerpt'],
      ]]
    ],
    templateLock: false,
  },

  supports: {
    align: true,
    className: true,
  },
};

export default postQueryBlockDefinition;
```

---

#### Post Template Block

```typescript
// apps/admin-dashboard/src/blocks/definitions/post-template.tsx

import React from 'react';
import { FileText } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import PostTemplateBlock from '@/components/editor/blocks/PostTemplateBlock';

export const postTemplateBlockDefinition: BlockDefinition = {
  name: 'o4o/post-template',
  title: 'Post Template',
  category: 'dynamic',
  icon: <FileText className="w-5 h-5" />,
  description: 'Template for rendering individual post items in a query loop.',
  keywords: ['post', 'template', 'loop', 'item'],
  component: PostTemplateBlock,

  // Parent restriction
  parent: ['o4o/post-query'],

  innerBlocksSettings: {
    allowedBlocks: [
      'o4o/post-title',
      'o4o/post-excerpt',
      'o4o/post-featured-image',
      'o4o/post-meta',
      'o4o/post-date',
      'o4o/post-author',
      // Layout blocks
      'o4o/group',
      'o4o/columns',
    ],
    renderAppender: 'button',
  },

  supports: {
    className: true,
  },
};

export default postTemplateBlockDefinition;
```

---

### 컴포넌트 구현 예시

#### PostQueryBlock.tsx

```typescript
// apps/admin-dashboard/src/components/editor/blocks/PostQueryBlock.tsx

import React, { useState, useEffect } from 'react';
import { BlockProps } from '@/blocks/registry/types';
import { QueryControls } from '@/blocks/shared/QueryControls';
import InspectorControls from '../InspectorControls';
import InnerBlocks from '../InnerBlocks';
import { postApi } from '@/services/api/postApi';

interface PostQueryBlockProps extends BlockProps {
  attributes: {
    query: {
      postType: string;
      perPage: number;
      orderBy: string;
      order: 'asc' | 'desc';
      offset: number;
      search: string;
      category: string[];
      tag: string[];
      author: string[];
      status: string[];
    };
    layout: 'list' | 'grid' | 'custom';
    columns: number;
    gap: number;
  };
}

const PostQueryBlock: React.FC<PostQueryBlockProps> = ({
  attributes,
  setAttributes,
  innerBlocks = [],
  onInnerBlocksChange,
  isSelected,
}) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch posts based on query
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const response = await postApi.getPosts({
          page: 1,
          perPage: attributes.query.perPage,
          orderBy: attributes.query.orderBy,
          order: attributes.query.order,
          search: attributes.query.search,
          category: attributes.query.category,
          tag: attributes.query.tag,
          author: attributes.query.author,
          status: attributes.query.status,
        });
        setPosts(response.data);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [attributes.query]);

  return (
    <div className="o4o-post-query-block">
      {/* Inspector Controls (Sidebar) */}
      {isSelected && (
        <InspectorControls>
          <div className="space-y-4">
            <h3 className="font-semibold">Post Query Settings</h3>

            {/* Query Controls */}
            <QueryControls
              attributes={attributes}
              setAttributes={setAttributes}
              postType="post"
            />

            {/* Category Filter */}
            {/* Tag Filter */}
            {/* Author Filter */}
            {/* ... */}
          </div>
        </InspectorControls>
      )}

      {/* Block Content (Editor View) */}
      <div className="o4o-post-query-preview">
        {loading && <div>Loading posts...</div>}

        {!loading && posts.length === 0 && (
          <div className="text-gray-500">
            No posts found. Adjust your query settings.
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div
            className={`o4o-post-query-layout-${attributes.layout}`}
            style={{
              display: attributes.layout === 'grid' ? 'grid' : 'flex',
              gridTemplateColumns: attributes.layout === 'grid'
                ? `repeat(${attributes.columns}, 1fr)`
                : undefined,
              gap: `${attributes.gap}px`,
            }}
          >
            {posts.map((post) => (
              <div key={post.id} className="o4o-post-item">
                {/* Render InnerBlocks (Post Template) with post context */}
                <PostContext.Provider value={post}>
                  <InnerBlocks
                    blocks={innerBlocks}
                    onChange={onInnerBlocksChange}
                    allowedBlocks={['o4o/post-template']}
                  />
                </PostContext.Provider>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostQueryBlock;
```

---

### QueryControls 확장

```typescript
// apps/admin-dashboard/src/blocks/shared/QueryControls.tsx (수정)

interface QueryControlsProps {
  attributes: any;
  setAttributes: (attrs: any) => void;
  postType?: 'post' | 'product' | 'custom';  // ← 확장
}

export function QueryControls({ attributes, setAttributes, postType = 'post' }: QueryControlsProps) {
  const { query = {} } = attributes;

  const updateQuery = (key: string, value: any) => {
    setAttributes({
      query: {
        ...query,
        [key]: value
      }
    });
  };

  // Post 타입별 orderBy 옵션
  const orderByOptions = postType === 'product' ? [
    { label: 'Date', value: 'date' },
    { label: 'Title', value: 'title' },
    { label: 'Price', value: 'price' },
    { label: 'Sales', value: 'sales' },
    { label: 'Rating', value: 'rating' },
    { label: 'Menu Order', value: 'menu_order' },
    { label: 'Random', value: 'rand' }
  ] : [
    { label: 'Date', value: 'date' },
    { label: 'Title', value: 'title' },
    { label: 'Modified', value: 'modified' },  // ← Post 전용
    { label: 'Comment Count', value: 'comment_count' },  // ← Post 전용
    { label: 'Menu Order', value: 'menu_order' },
    { label: 'Random', value: 'rand' }
  ];

  return (
    <div className="o4o-query-controls space-y-4">
      {/* 기존 컨트롤 */}
      <div className="space-y-2">
        <Label htmlFor="per-page-slider">Number of items: {query.perPage || 10}</Label>
        <Slider
          min={1}
          max={50}
          step={1}
          value={[query.perPage || 10]}
          onValueChange={(value) => updateQuery('perPage', value[0])}
        />
      </div>

      {/* orderBy */}
      <div className="space-y-2">
        <Label htmlFor="order-by-select">Order by</Label>
        <Select value={query.orderBy || 'date'} onValueChange={(value) => updateQuery('orderBy', value)}>
          <SelectTrigger id="order-by-select">
            <SelectValue placeholder="Select order by" />
          </SelectTrigger>
          <SelectContent>
            {orderByOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product 전용 필터 */}
      {postType === 'product' && (
        <>
          {/* Featured, On Sale, In Stock */}
        </>
      )}

      {/* Post 전용 필터 */}
      {postType === 'post' && (
        <>
          {/* Category, Tag, Author 필터 추가 */}
        </>
      )}

      {/* 공통 필터 */}
      <div className="space-y-2">
        <Label htmlFor="search-input">Search</Label>
        <Input
          id="search-input"
          type="text"
          value={query.search || ''}
          onChange={(e) => updateQuery('search', e.target.value)}
          placeholder="Search..."
        />
      </div>

      {/* Offset */}
      <div className="space-y-2">
        <Label htmlFor="offset-input">Offset</Label>
        <Input
          id="offset-input"
          type="number"
          value={query.offset || 0}
          onChange={(e) => updateQuery('offset', e.target.value ? parseInt(e.target.value) : 0)}
          placeholder="Number of items to skip"
        />
      </div>
    </div>
  );
}
```

---

## 🚀 구현 로드맵

### Phase 1: Post 블록 (3주)

#### Week 1: Post Query Block
- [ ] `o4o/post-query` 블록 정의
- [ ] PostQueryBlock 컴포넌트 구현
- [ ] QueryControls 확장 (Post 타입)
- [ ] Post API 연동
- [ ] Category/Tag/Author 필터 UI

#### Week 2: Post Template & Content Blocks
- [ ] `o4o/post-template` 블록 정의
- [ ] `o4o/post-title` 블록
- [ ] `o4o/post-excerpt` 블록
- [ ] `o4o/post-featured-image` 블록
- [ ] `o4o/post-meta` 블록
- [ ] `o4o/post-date` 블록
- [ ] `o4o/post-author` 블록

#### Week 3: Layout & Testing
- [ ] List 레이아웃 구현
- [ ] Grid 레이아웃 구현
- [ ] Custom 레이아웃 지원
- [ ] 반응형 디자인
- [ ] Post Context Provider
- [ ] 통합 테스트

---

### Phase 2: CPT 블록 (2주)

#### Week 1: CPT Query Block
- [ ] `o4o/cpt-query` 블록 정의
- [ ] CPTQueryBlock 컴포넌트 구현
- [ ] CPT 선택 UI
- [ ] CPT Taxonomy 필터
- [ ] CPT API 연동

#### Week 2: CPT Template & Field Blocks
- [ ] `o4o/cpt-template` 블록 정의
- [ ] `o4o/cpt-field` 블록 (ACF 통합)
- [ ] CPT Context Provider
- [ ] ACF 필드 자동 매핑
- [ ] 통합 테스트

---

## 📊 비교 요약

| 항목 | WordPress Query Loop | 커스텀 Query 블록 | 선택 |
|------|---------------------|-----------------|------|
| 현재 아키텍처 통합 | ❌ 불가능 | ✅ 완벽 통합 | ✅ 커스텀 |
| Block Registry 활용 | ❌ 불가능 | ✅ 가능 | ✅ 커스텀 |
| QueryControls 재사용 | ❌ 불가능 | ✅ 가능 | ✅ 커스텀 |
| InnerBlocks 지원 | ✅ 지원 | ✅ 지원 | 동일 |
| 타입 안전성 | ⚠️ 제한적 | ✅ 보장 | ✅ 커스텀 |
| WordPress 독립성 | ❌ 의존 | ✅ 독립 | ✅ 커스텀 |
| 설계 자료 | ✅ 풍부 | ⚠️ 직접 작성 | ⚠️ WordPress |
| 개발 속도 | ❌ 통합 복잡 | ✅ 빠름 | ✅ 커스텀 |
| 확장성 | ⚠️ 제한적 | ✅ 자유로움 | ✅ 커스텀 |
| ACF 통합 | ⚠️ 복잡 | ✅ 용이 | ✅ 커스텀 |

**최종 선택**: ✅ **커스텀 Query 블록 구현 (Block Registry 기반)**

---

## 🎯 핵심 결론

### 1. WordPress Query Loop 사용 불가
- 현재 아키텍처는 WordPress 폴리필 방식
- `registerBlockVariation` 미구현
- Block Registry로 자체 블록 관리

### 2. 커스텀 구현이 최적
- Block Registry와 완벽 통합
- 기존 QueryControls 재사용 가능
- InnerBlocks 시스템 활용 가능
- 타입 안전성 보장

### 3. 2단계 전략 유지
- **Phase 1**: Post 블록 (설계 자료 참고)
- **Phase 2**: CPT 블록 (Post 패턴 재사용)

### 4. 활용 가능한 자산
- ✅ QueryControls 컴포넌트
- ✅ InnerBlocks 시스템
- ✅ Block Registry
- ✅ DynamicRenderer
- ✅ Conditional Block 패턴

---

## 📝 다음 단계

1. **Post Query Block 상세 설계서 작성**
   - 블록 구조 정의
   - API 연동 방식
   - InnerBlocks 구성
   - Context Provider 설계

2. **QueryControls 확장 계획**
   - Post 타입 지원
   - Category/Tag/Author 필터
   - Status 필터

3. **Post Template Block 설계**
   - Context API 구조
   - 허용 블록 목록
   - 데이터 주입 방식

4. **구현 시작**
   - Week 1: Post Query Block
   - Week 2: Post Template & Content Blocks
   - Week 3: Layout & Testing

---

**문서 버전**: 1.0
**작성자**: Claude Code
**검토 필요 사항**:
- [ ] Post API 연동 방식 확인
- [ ] Category/Tag API 확인
- [ ] ACF API 확인
