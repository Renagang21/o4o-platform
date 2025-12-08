# CMS Engine Specification

> O4O Platform CMS 엔진 아키텍처 및 API 레퍼런스

## 1. Overview

O4O CMS Engine은 WordPress Gutenberg 호환 블록 기반 콘텐츠 관리 시스템입니다.

### 핵심 특징

- **Block-Based Architecture**: Gutenberg 스타일 JSON 블록 구조
- **Shortcode System**: WordPress 호환 쇼트코드 렌더링
- **Template Engine**: Draft/Published 상태 관리
- **Multi-Format Naming**: `o4o/`, `core/`, 베어 네임 모두 지원

### 패키지 구조

```
packages/
├── block-core/           # 블록 정의 및 에디터 레지스트리
├── block-renderer/       # 프론트엔드 블록 렌더링
├── shortcodes/          # 쇼트코드 파서 및 렌더러
└── types/               # 공유 타입 정의
```

---

## 2. Block System

### 2.1 Block Structure

모든 블록은 다음 JSON 구조를 따릅니다:

```typescript
interface Block {
  id?: string;           // 유니크 식별자
  clientId?: string;     // WordPress 호환 클라이언트 ID
  type: string;          // 블록 타입 (e.g., 'o4o/paragraph')
  name?: string;         // WordPress 스타일 이름 (type과 동일)
  data?: Record<string, any>;       // 블록 데이터
  attributes?: Record<string, any>; // WordPress 호환 속성
  content?: any;         // TipTap 콘텐츠
  innerBlocks?: Block[]; // 중첩 블록
  innerHTML?: string;    // 원본 HTML
  innerContent?: (string | null)[]; // WordPress 호환
}
```

### 2.2 Block Naming Convention

**정규 형식**: `o4o/{block-name}`

| 형식 | 예시 | 설명 |
|------|------|------|
| `o4o/{name}` | `o4o/paragraph` | **정규 형식** (권장) |
| `core/{name}` | `core/paragraph` | WordPress 호환 |
| `{name}` | `paragraph` | 베어 네임 (레거시) |

**자동 정규화**: BlockRegistry는 모든 형식을 자동으로 인식합니다.

```typescript
// 모두 동일한 컴포넌트를 반환
blockRegistry.get('paragraph');
blockRegistry.get('core/paragraph');
blockRegistry.get('o4o/paragraph');
```

### 2.3 Available Blocks

#### Text Blocks
| Block Name | 설명 |
|------------|------|
| `o4o/paragraph` | 텍스트 단락 |
| `o4o/heading` | 제목 (h1-h6) |
| `o4o/list` | 순서/비순서 목록 |
| `o4o/quote` | 인용문 |
| `o4o/code` | 코드 블록 |

#### Media Blocks
| Block Name | 설명 |
|------------|------|
| `o4o/image` | 이미지 |
| `o4o/video` | 비디오 |
| `o4o/gallery` | 이미지 갤러리 |
| `o4o/audio` | 오디오 |
| `o4o/slide` | 슬라이드쇼 |

#### Layout Blocks
| Block Name | 설명 |
|------------|------|
| `o4o/columns` | 컬럼 컨테이너 |
| `o4o/column` | 개별 컬럼 |
| `o4o/group` | 블록 그룹 |
| `o4o/button` | 버튼 |
| `o4o/buttons` | 버튼 그룹 |
| `o4o/separator` | 구분선 |
| `o4o/spacer` | 공백 |
| `o4o/table` | 테이블 |
| `o4o/timeline-chart` | 타임라인 차트 |
| `o4o/icon-feature-list` | 아이콘 기능 목록 |

#### Special Blocks
| Block Name | 설명 |
|------------|------|
| `o4o/markdown` | 마크다운 렌더러 |
| `o4o/html` | 커스텀 HTML |
| `o4o/embed` | 외부 콘텐츠 임베드 |
| `o4o/cover` | 커버 이미지/비디오 |
| `o4o/shortcode` | 쇼트코드 렌더러 |

#### Product Blocks
| Block Name | 설명 |
|------------|------|
| `o4o/product-card` | 상품 카드 |
| `o4o/product-title` | 상품 제목 |
| `o4o/product-price` | 상품 가격 |
| `o4o/product-gallery` | 상품 갤러리 |
| `o4o/product-description` | 상품 설명 |
| `o4o/add-to-cart-panel` | 장바구니 추가 패널 |

---

## 3. Rendering Pipeline

### 3.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Content Rendering Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│   │   Template   │      │    Block     │      │   Rendered   │  │
│   │    JSON      │─────▶│  Renderer    │─────▶│    HTML      │  │
│   │              │      │              │      │              │  │
│   └──────────────┘      └──────────────┘      └──────────────┘  │
│                                │                                 │
│                                │                                 │
│                    ┌───────────┴───────────┐                    │
│                    │                       │                     │
│             ┌──────▼──────┐         ┌──────▼──────┐             │
│             │ Block       │         │ Shortcode   │             │
│             │ Registry    │         │ Registry    │             │
│             └──────┬──────┘         └──────┬──────┘             │
│                    │                       │                     │
│             ┌──────▼──────┐         ┌──────▼──────┐             │
│             │ React       │         │ Dynamic     │             │
│             │ Components  │         │ Components  │             │
│             └─────────────┘         └─────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 BlockRenderer Component

메인 렌더링 컴포넌트:

```tsx
import { BlockRenderer } from '@o4o/block-renderer';

// 사용 예시
<BlockRenderer
  blocks={templateContent}
  className="page-content"
/>
```

**렌더링 로직:**

1. 입력 블록 배열/단일 블록 정규화
2. 각 블록의 `type` 또는 `name` 필드로 컴포넌트 조회
3. BlockRegistry에서 매칭되는 컴포넌트 반환
4. 컴포넌트 렌더링, 알 수 없는 타입은 경고 표시

### 3.3 Block Registry

```typescript
import { blockRegistry } from '@o4o/block-renderer';

// 블록 등록
blockRegistry.register('o4o/custom-block', CustomBlockComponent);

// 여러 블록 등록
blockRegistry.registerMany({
  'o4o/block-a': BlockAComponent,
  'o4o/block-b': BlockBComponent,
});

// 블록 조회 (자동 네이밍 정규화)
const Component = blockRegistry.get('custom-block');

// 등록된 타입 목록
const types = blockRegistry.getRegisteredTypes();
```

---

## 4. Template System

### 4.1 Template Entity

```typescript
interface Template {
  id: string;
  name: string;
  slug?: string;
  type: 'page' | 'post' | 'archive' | 'single' | 'product' | string;
  layoutType?: 'personal-blog' | 'photo-blog' | 'complex-blog' | 'custom';
  description?: string;
  thumbnail?: string;
  preview?: string;
  content: TipTapJSONContent;  // 블록 콘텐츠 JSON
  customFields?: string[] | Record<string, unknown>;
  settings?: Record<string, unknown>;
  isDefault?: boolean;
  featured?: boolean;
  status: 'draft' | 'published';  // 상태 enum
  category?: string;
  tags?: string[];
  version?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 Template Status

| 상태 | 설명 | API 동작 |
|------|------|---------|
| `draft` | 초안 상태 | 목록에 표시, 프론트에서 렌더링 안됨 |
| `published` | 발행됨 | 프론트엔드에서 렌더링 가능 |

**상태 변경 API:**

```bash
# 발행
POST /api/admin/templates/:id/publish

# 비발행
POST /api/admin/templates/:id/unpublish
```

### 4.3 Template API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/admin/templates` | 템플릿 목록 |
| GET | `/api/admin/templates/:id` | 템플릿 상세 |
| POST | `/api/admin/templates` | 템플릿 생성 |
| PUT | `/api/admin/templates/:id` | 템플릿 수정 |
| DELETE | `/api/admin/templates/:id` | 템플릿 삭제 |
| POST | `/api/admin/templates/:id/publish` | 템플릿 발행 |
| POST | `/api/admin/templates/:id/unpublish` | 템플릿 비발행 |
| GET | `/api/admin/templates/system/:name` | 시스템 템플릿 |
| POST | `/api/admin/templates/import` | 템플릿 가져오기 |
| GET | `/api/admin/templates/:id/export` | 템플릿 내보내기 |

---

## 5. Shortcode System

### 5.1 Shortcode Syntax

```
[shortcode_name attr1="value1" attr2="value2"]
[shortcode_name attr1="value1"]Content[/shortcode_name]
```

### 5.2 Shortcode Registry

```typescript
import { shortcodeRegistry } from '@o4o/shortcodes';

// 쇼트코드 등록
shortcodeRegistry.register('my_shortcode', {
  name: 'my_shortcode',
  component: MyShortcodeComponent,
  description: '커스텀 쇼트코드',
  attributes: {
    title: { type: 'string', default: '' },
    count: { type: 'number', default: 10 },
  },
});
```

### 5.3 ShortcodeRenderer Component

```tsx
import { ShortcodeRenderer } from '@o4o/shortcodes';

<ShortcodeRenderer
  content="[products count='5']"
  context={{ postId: '123' }}
  LoadingComponent={LoadingSpinner}
  ErrorComponent={ErrorDisplay}
  UnknownShortcodeComponent={UnknownHandler}
/>
```

### 5.4 Built-in Shortcodes

| Shortcode | 설명 | 예시 |
|-----------|------|------|
| `[cpt_list]` | CPT 목록 | `[cpt_list type="product" count="10"]` |
| `[cpt_field]` | CPT 필드 값 | `[cpt_field name="price"]` |
| `[acf_field]` | ACF 필드 값 | `[acf_field name="custom_meta"]` |
| `[meta_field]` | 메타 필드 | `[meta_field key="views"]` |
| `[social_login]` | 소셜 로그인 | `[social_login providers="google,naver"]` |
| `[seller_dashboard]` | 판매자 대시보드 | `[seller_dashboard]` |
| `[supplier_dashboard]` | 공급자 대시보드 | `[supplier_dashboard]` |
| `[affiliate_dashboard]` | 제휴 대시보드 | `[affiliate_dashboard]` |

---

## 6. Database Schema

### 6.1 Templates Table

```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  type VARCHAR(50) NOT NULL,
  layout_type VARCHAR(50),
  description TEXT,
  thumbnail TEXT,
  preview TEXT,
  content JSONB NOT NULL,
  custom_fields JSONB,
  settings JSONB,
  is_default BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  status templates_status_enum DEFAULT 'draft',
  category VARCHAR(255),
  tags TEXT[],
  version VARCHAR(20),
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Status enum type
CREATE TYPE templates_status_enum AS ENUM ('draft', 'published');
```

### 6.2 Migration

```bash
# 마이그레이션 실행
cd apps/api-server
npx typeorm migration:run -d src/data-source.ts
```

---

## 7. Development Guide

### 7.1 Creating Custom Blocks

**Step 1: Block Component 생성**

```tsx
// packages/block-renderer/src/renderers/custom/MyBlock.tsx
import React from 'react';
import { BlockRendererProps } from '../../types/block.types';
import { getBlockData } from '../../utils/block-parser';

export const MyBlock: React.FC<BlockRendererProps> = ({ block }) => {
  const title = getBlockData(block, 'title', 'Default Title');
  const className = getBlockData(block, 'className', '');

  return (
    <div className={`my-block ${className}`}>
      <h2>{title}</h2>
      {block.innerBlocks && (
        <BlockRenderer blocks={block.innerBlocks} />
      )}
    </div>
  );
};
```

**Step 2: Registry에 등록**

```typescript
// packages/block-renderer/src/renderers/index.ts
import { MyBlock } from './custom/MyBlock';

blockRegistry.registerMany({
  'o4o/my-block': MyBlock,
  'my-block': MyBlock,
});
```

### 7.2 Creating Custom Shortcodes

```tsx
// packages/shortcodes/src/custom/my-shortcode.tsx
import React from 'react';
import { shortcodeRegistry, ShortcodeComponent } from '@o4o/shortcodes';

const MyShortcode: ShortcodeComponent = ({ attributes, content }) => {
  const { title = 'Hello' } = attributes;

  return (
    <div className="my-shortcode">
      <h3>{title}</h3>
      {content && <div className="content">{content}</div>}
    </div>
  );
};

shortcodeRegistry.register('my_shortcode', {
  name: 'my_shortcode',
  component: MyShortcode,
  description: 'A custom shortcode',
  attributes: {
    title: { type: 'string', default: 'Hello' },
  },
});
```

### 7.3 Block Name Normalization Script

기존 데이터베이스의 블록 이름을 정규화:

```bash
# Dry run (변경 없이 미리보기)
npx ts-node scripts/cms/normalize-blocknames.ts --dry-run

# 실행
npx ts-node scripts/cms/normalize-blocknames.ts

# 상세 출력
npx ts-node scripts/cms/normalize-blocknames.ts --verbose
```

---

## 8. API Reference

### 8.1 Block Renderer API

```typescript
// BlockRenderer
interface BlockRendererProps {
  blocks: Block | Block[];
  className?: string;
}

// BlockRegistry
class BlockRegistry {
  register(type: string, component: BlockComponent): void;
  registerMany(blocks: Record<string, BlockComponent>): void;
  registerLazy(type: string, loader: () => Promise<{ default: BlockComponent }>): void;
  get(type: string): BlockComponent | undefined;
  has(type: string): boolean;
  getRegisteredTypes(): string[];
  clear(): void;
}
```

### 8.2 Shortcode API

```typescript
// ShortcodeRenderer
interface ShortcodeRendererProps {
  content: string;
  context?: Record<string, any>;
  LoadingComponent?: React.ComponentType;
  ErrorComponent?: React.ComponentType<{ error: Error }>;
  UnknownShortcodeComponent?: React.ComponentType<{ shortcode: ParsedShortcode }>;
}

// ShortcodeRegistry
class ShortcodeRegistry {
  register(name: string, definition: ShortcodeDefinition): void;
  get(name: string): ShortcodeDefinition | undefined;
  has(name: string): boolean;
  getAll(): ShortcodeDefinition[];
}
```

### 8.3 Template API Types

```typescript
// Request: Create/Update Template
interface TemplateCreateRequest {
  name: string;
  type: string;
  content: TipTapJSONContent;
  description?: string;
  status?: 'draft' | 'published';
}

// Response: Template
interface TemplateResponse {
  success: boolean;
  data: Template;
  message?: string;
}

// Response: Template List
interface TemplateListResponse {
  success: boolean;
  data: Template[];
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
```

---

## 9. Best Practices

### 9.1 Block Development

1. **일관된 네이밍**: 항상 `o4o/` 접두사 사용
2. **속성 접근**: `getBlockData()` 유틸리티 사용
3. **중첩 블록**: `innerBlocks` 재귀 렌더링 지원
4. **에러 처리**: 누락된 속성에 대한 기본값 제공

### 9.2 Shortcode Development

1. **순수 함수**: 쇼트코드 컴포넌트는 사이드 이펙트 없이
2. **로딩 상태**: 비동기 데이터 로딩 시 로딩 UI 제공
3. **에러 바운더리**: 렌더링 에러 격리
4. **캐싱**: 자주 사용되는 데이터는 캐시 활용

### 9.3 Template Management

1. **버전 관리**: 템플릿 변경 시 버전 업데이트
2. **Draft 상태 활용**: 변경사항 테스트 후 발행
3. **백업**: 중요 템플릿은 Export 기능으로 백업

---

## 10. Changelog

### v2.0.0 (2024-12)
- Template status를 `active: boolean`에서 `status: enum`으로 변경
- Block naming 표준화 (`o4o/` 접두사)
- 블록 이름 정규화 스크립트 추가

### v1.0.0 (2024-10)
- 초기 CMS Engine 릴리스
- 기본 블록 시스템 구현
- 쇼트코드 시스템 구현
- 템플릿 관리 API

---

*문서 최종 업데이트: 2024-12-08*
