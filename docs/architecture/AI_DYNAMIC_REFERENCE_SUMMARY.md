# AI 동적 참조 시스템 요약

## 개요

AI 페이지 생성 기능이 **블록과 숏코드를 동적으로 참조**하여 항상 최신 상태를 유지하도록 개선했습니다.

## 🎯 해결한 문제

### Before (문제점)

```typescript
// ❌ 하드코딩된 블록/숏코드 목록
const availableBlocks = `
=== 사용 가능한 블록 ===
- core/paragraph: 단락
- core/heading: 제목
- core/image: 이미지
// ... 수동으로 나열
`;

// 문제:
// 1. 새 블록 추가 시 수동 업데이트 필요
// 2. 블록 삭제 시 AI가 여전히 사용 시도
// 3. 속성 변경 시 동기화 안됨
// 4. 휴먼 에러 발생
```

### After (해결)

```typescript
// ✅ 동적 참조 시스템
import { generateCompleteReference } from './block-registry-extractor';

const availableBlocks = generateCompleteReference();
// 런타임에 실제 등록된 블록/숏코드를 스캔하여 자동 생성!

// 장점:
// 1. 블록 추가 시 자동 인식
// 2. 블록 삭제 시 자동 제외
// 3. 속성 변경 시 즉시 반영
// 4. 휴먼 에러 제거
```

---

## 📁 파일 구조

```
apps/admin-dashboard/src/
├── services/ai/
│   ├── SimpleAIGenerator.ts           # AI 생성기 (동적 참조 사용)
│   ├── block-registry-extractor.ts    # 블록/숏코드 추출기 ⭐
│   └── shortcode-registry.ts          # 숏코드 레지스트리 ⭐
│
├── utils/
│   └── block-manager.ts               # 블록 매니저
│
└── components/
    ├── editor/blocks/                 # 블록 컴포넌트
    └── shortcodes/                    # 숏코드 컴포넌트
        ├── ShortcodeRenderer.tsx      # 숏코드 렌더러
        └── dropshipping/              # 드롭쉬핑 숏코드

docs/
├── architecture/
│   ├── AI_BLOCK_REFERENCE_SYSTEM.md  # 전체 시스템 문서
│   └── AI_DYNAMIC_REFERENCE_SUMMARY.md # 이 문서
└── guide/
    └── ADD_NEW_SHORTCODE.md          # 숏코드 추가 가이드
```

---

## 🔧 핵심 컴포넌트

### 1. Block Registry Extractor

**파일**: `block-registry-extractor.ts`

**역할**: 런타임에 블록 레지스트리 스캔

```typescript
// 블록 추출
export function extractBlocksMetadata(): BlockMetadata[] {
  if (window.wp?.blocks?.getBlockTypes) {
    const blockTypes = window.wp.blocks.getBlockTypes();
    return blockTypes.map(block => ({
      name: block.name,
      title: block.title,
      description: block.description,
      attributes: block.attributes,
      example: generateBlockExample(block)
    }));
  }
  return [];
}

// 숏코드 추출
export function extractShortcodesMetadata(): ShortcodeMetadata[] {
  // 1. 일반 숏코드 레지스트리
  const general = extractFromRegistry(generalShortcodes);

  // 2. Dropshipping 숏코드
  const dropshipping = extractFromDropshipping(dropshippingShortcodes);

  return [...general, ...dropshipping];
}

// AI 프롬프트용 레퍼런스 생성
export function generateCompleteReference(): string {
  return generateBlocksReference() + '\n' + generateShortcodesReference();
}
```

### 2. Shortcode Registry

**파일**: `shortcode-registry.ts`

**역할**: 숏코드 중앙 관리

```typescript
// 카테고리별 숏코드 정의
export const contentShortcodes: Record<string, ShortcodeConfig> = {
  'gallery': {
    description: '이미지 갤러리',
    category: 'Media',
    attributes: {
      ids: { type: 'string', required: true },
      columns: { type: 'number', default: 3 }
    }
  }
};

export const ecommerceShortcodes: Record<string, ShortcodeConfig> = {
  'product': {
    description: '상품 표시',
    category: 'E-commerce',
    attributes: {
      id: { type: 'string', required: true }
    }
  }
};

// 동적 등록
export function registerShortcode(name: string, config: ShortcodeConfig) {
  dynamicShortcodes[name] = config;
}
```

### 3. AI Generator Integration

**파일**: `SimpleAIGenerator.ts`

**역할**: AI 생성 시 동적 참조 사용

```typescript
private getSystemPrompt(template: string): string {
  const baseRules = `...규칙...`;

  // 🔥 동적으로 생성!
  const availableBlocks = generateCompleteReference();

  return `${baseRules}\n\n${availableBlocks}\n\n...`;
}
```

---

## 🚀 사용 방법

### 블록 추가

```typescript
// 1. 블록 컴포넌트 작성
// MyBlock.tsx

// 2. 블록 등록
wp.blocks.registerBlockType('o4o/my-block', {
  title: '새 블록',
  description: '새로운 기능',
  category: 'design',
  attributes: { color: { type: 'string', default: 'blue' } }
});

// 3. 끝! AI가 자동 인식
```

### 숏코드 추가

```typescript
// 1. shortcode-registry.ts에 등록
export const contentShortcodes = {
  'my_shortcode': {
    description: '내 숏코드',
    category: 'Content',
    attributes: {
      title: { type: 'string', default: '제목' }
    }
  }
};

// 2. 컴포넌트 작성 및 렌더러 등록

// 3. 끝! AI가 자동 인식
```

---

## 🎨 실제 동작 예시

### 시나리오 1: 새 블록 추가

```typescript
// 개발자: 새 "평점" 블록 추가
wp.blocks.registerBlockType('o4o/rating', {
  title: '평점',
  description: '별점 표시',
  attributes: {
    rating: { type: 'number', default: 5 },
    maxRating: { type: 'number', default: 5 }
  }
});

// AI가 즉시 인식:
사용자: "상품 리뷰 페이지 만들어줘"
AI: {
  "blocks": [
    {"type": "core/heading", "content": {"text": "상품 리뷰"}},
    {"type": "o4o/rating", "attributes": {"rating": 4, "maxRating": 5}},
    {"type": "core/paragraph", "content": {"text": "훌륭한 상품입니다!"}}
  ]
}
```

### 시나리오 2: 숏코드 속성 변경

```typescript
// 개발자: product_grid 속성 추가
export const ecommerceShortcodes = {
  'product_grid': {
    description: '상품 그리드',
    attributes: {
      category: { type: 'string' },
      limit: { type: 'number', default: 8 },
      sort: { type: 'string', default: 'newest' }  // 새 속성!
    }
  }
};

// AI가 즉시 반영:
사용자: "인기 상품 페이지 만들어줘"
AI: [product_grid category="전자제품" limit="12" sort="popular"]
```

---

## 📊 Before vs After 비교

| 항목 | Before | After |
|------|--------|-------|
| 블록 목록 관리 | 수동 하드코딩 | 자동 스캔 |
| 새 블록 추가 시 | AI 프롬프트 수정 필요 | 자동 인식 |
| 블록 삭제 시 | 수동 제거 필요 | 자동 제외 |
| 속성 변경 시 | 동기화 필요 | 즉시 반영 |
| 휴먼 에러 | 발생 가능 | 제거됨 |
| 유지보수성 | 낮음 | 높음 |
| 확장성 | 어려움 | 쉬움 |

---

## ✅ 체크리스트

### 블록 개발자

- [x] 블록 컴포넌트 작성
- [x] `wp.blocks.registerBlockType()` 호출
- [x] ~~AI 프롬프트 업데이트~~ (자동!)
- [x] ~~문서 업데이트~~ (자동!)

### 숏코드 개발자

- [x] `shortcode-registry.ts`에 정의
- [x] 숏코드 컴포넌트 작성
- [x] `ShortcodeRenderer`에 등록
- [x] ~~AI 프롬프트 업데이트~~ (자동!)
- [x] ~~문서 업데이트~~ (자동!)

---

## 🔮 향후 개선 계획

### Phase 2: 완전 자동화

```typescript
// ShortcodeRenderer를 스캔하여 자동 등록
// 더 이상 shortcode-registry.ts 수정 불필요!

export function autoRegisterShortcodes() {
  const componentMap = getComponentMap();

  Object.keys(componentMap).forEach(name => {
    const Component = componentMap[name];

    // JSDoc 주석에서 메타데이터 추출
    const metadata = extractMetadataFromComponent(Component);

    registerShortcode(name, metadata);
  });
}
```

### Phase 3: AI 학습

```typescript
// AI가 어떤 블록/숏코드를 자주 사용하는지 추적
export function trackBlockUsage(blockName: string, context: string) {
  // 사용 통계 수집
  // 인기 블록 우선 표시
  // 블록 조합 패턴 학습
}
```

### Phase 4: 시각적 블록 빌더

```
사용자가 블록을 시각적으로 조합
  ↓
AI가 패턴 학습
  ↓
더 나은 페이지 자동 생성
```

---

## 📚 관련 문서

- [AI 블록/숏코드 참조 시스템](./AI_BLOCK_REFERENCE_SYSTEM.md) - 전체 아키텍처
- [새 숏코드 추가하기](../guide/ADD_NEW_SHORTCODE.md) - 숏코드 추가 가이드
- [AI 페이지 생성 매뉴얼](../manual/ai-page-generation.md) - 사용자 가이드

---

## 🎉 결론

**블록과 숏코드를 동적으로 참조하는 시스템**을 구축하여:

✅ **자동 동기화**: 수동 업데이트 불필요
✅ **항상 최신**: 블록/숏코드 변경 즉시 반영
✅ **휴먼 에러 제거**: 목록 관리 자동화
✅ **유지보수 편의**: 블록만 등록하면 끝
✅ **확장성**: 쉽게 새 기능 추가

**개발자는 이제 블록/숏코드만 작성하면 AI가 자동으로 인식하고 사용합니다! 🚀**
