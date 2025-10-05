# AI 블록/숏코드 참조 시스템

## 개요

AI 페이지 생성 기능은 동적으로 업데이트되는 블록과 숏코드 레지스트리를 참조하여 항상 최신 상태를 유지합니다.

## 아키텍처

### 1. 블록 레지스트리 추출기

**파일**: `apps/admin-dashboard/src/services/ai/block-registry-extractor.ts`

런타임에 WordPress 블록 레지스트리를 스캔하여 현재 등록된 모든 블록의 메타데이터를 추출합니다.

```typescript
// 사용 예시
import { generateCompleteReference } from './block-registry-extractor';

const reference = generateCompleteReference();
// AI 프롬프트에 포함할 블록/숏코드 레퍼런스 생성
```

**주요 기능**:
- `extractBlocksMetadata()`: 등록된 블록 정보 추출
- `extractShortcodesMetadata()`: 숏코드 정보 추출
- `generateBlocksReference()`: AI용 블록 레퍼런스 생성
- `generateShortcodesReference()`: AI용 숏코드 레퍼런스 생성
- `generateCompleteReference()`: 전체 레퍼런스 생성

### 2. AI 생성기 통합

**파일**: `apps/admin-dashboard/src/services/ai/SimpleAIGenerator.ts`

AI 페이지 생성 시 동적으로 블록/숏코드 정보를 프롬프트에 포함합니다.

```typescript
private getSystemPrompt(template: string): string {
  const baseRules = `...규칙...`;

  // 🔥 런타임에 동적으로 생성!
  const availableBlocks = generateCompleteReference();

  return `${baseRules}\n\n${availableBlocks}\n\n...`;
}
```

### 3. 문서 자동 업데이트

**파일**: `apps/admin-dashboard/src/scripts/update-ai-docs.ts`

블록과 숏코드가 추가/변경될 때 사용자 매뉴얼을 자동으로 업데이트합니다.

```bash
# 문서 업데이트 명령
npm run update-ai-docs
```

**생성되는 문서**: `docs/manual/ai-page-generation.md`

## 작동 방식

### 런타임 참조 (AI 생성 시)

```
1. 사용자가 "AI 페이지 생성" 클릭
   ↓
2. SimpleAIGenerator.getSystemPrompt() 호출
   ↓
3. generateCompleteReference() 호출
   ↓
4. window.wp.blocks.getBlockTypes() 스캔
   ↓
5. 등록된 모든 블록/숏코드 정보 추출
   ↓
6. AI 프롬프트에 동적으로 삽입
   ↓
7. AI가 최신 블록/숏코드 정보를 참조하여 페이지 생성
```

### 장점

#### 1. 자동 동기화
- 새 블록이 추가되면 즉시 AI가 사용 가능
- 별도 설정 파일 업데이트 불필요
- 휴먼 에러 제거

#### 2. 항상 최신 상태
- 블록 삭제 시 AI가 더 이상 참조하지 않음
- 블록 속성 변경 시 자동 반영
- 숏코드 업데이트 즉시 반영

#### 3. 유지보수 편의성
- 블록 개발자가 블록만 등록하면 끝
- AI 프롬프트 수동 수정 불필요
- 문서도 자동 생성 가능

## 블록/숏코드 추가 시 작업 흐름

### 새 블록 추가

```typescript
// 1. 블록 컴포넌트 작성
// apps/admin-dashboard/src/components/editor/blocks/MyNewBlock.tsx

// 2. 블록 등록
// apps/admin-dashboard/src/blocks/*/index.ts
wp.blocks.registerBlockType('o4o/my-new-block', {
  title: '새 블록',
  description: '새로운 기능을 하는 블록',
  category: 'design',
  attributes: {
    color: { type: 'string', default: 'blue' }
  },
  // ...
});

// 3. 끝! AI가 자동으로 인식
```

### 새 숏코드 추가

```typescript
// 1. 숏코드 컴포넌트 작성
// apps/admin-dashboard/src/components/shortcodes/MyShortcode.tsx

// 2. ShortcodeRenderer에 등록
// apps/admin-dashboard/src/components/shortcodes/ShortcodeRenderer.tsx
const COMPONENT_MAP = {
  // ...
  'my_shortcode': MyShortcode,
};

// 3. block-registry-extractor.ts의 extractShortcodesMetadata()에 추가
{
  name: 'my_shortcode',
  description: '내 숏코드 설명',
  attributes: ['param1', 'param2'],
  example: '[my_shortcode param1="value1"]'
}

// 4. 문서 업데이트 (선택사항)
npm run update-ai-docs
```

## 설정 및 커스터마이징

### 블록 예제 커스터마이징

`block-registry-extractor.ts`의 `getExampleContent()` 함수를 수정하여 블록별 예제를 커스터마이징할 수 있습니다:

```typescript
function getExampleContent(blockName: string): any {
  const examples: Record<string, any> = {
    'core/paragraph': { text: '단락 텍스트' },
    'o4o/my-block': {
      title: '예제 제목',
      content: '예제 내용'
    },
    // 새 블록 예제 추가
  };
  return examples[blockName] || {};
}
```

### 숏코드 카테고리 설정

`getShortcodeCategory()` 함수를 수정하여 숏코드 자동 분류 규칙을 변경할 수 있습니다:

```typescript
function getShortcodeCategory(name: string): string {
  if (name.includes('product')) return 'E-commerce';
  if (name.includes('my_prefix')) return 'My Category';
  // ...
  return 'Other';
}
```

## 문제 해결

### AI가 새 블록을 인식하지 못함

**원인**: 블록이 레지스트리에 등록되지 않았거나 페이지 로드 시점에 아직 로드되지 않음

**해결**:
1. 브라우저 콘솔에서 확인:
   ```javascript
   wp.blocks.getBlockTypes()
   ```
2. 블록이 목록에 없으면 블록 등록 코드 확인
3. 지연 로딩되는 블록이라면 `block-manager.ts`의 카테고리 설정 확인

### 숏코드가 AI 프롬프트에 포함되지 않음

**원인**: `extractShortcodesMetadata()`에 추가하지 않음

**해결**:
1. `block-registry-extractor.ts` 파일 열기
2. `extractShortcodesMetadata()` 함수에 숏코드 정보 추가
3. 앱 재시작 또는 페이지 새로고침

### 문서가 업데이트되지 않음

**원인**: TypeScript 컴파일 오류 또는 경로 문제

**해결**:
```bash
# 1. TypeScript 컴파일
npm run build

# 2. 문서 업데이트 스크립트 실행
npm run update-ai-docs

# 3. 에러 확인
```

## 향후 개선 사항

### 1. 자동 문서 업데이트 훅
- 블록 등록 시 자동으로 문서 생성
- Git pre-commit 훅 추가

### 2. 블록 사용 통계
- AI가 어떤 블록을 자주 사용하는지 추적
- 인기 블록 우선 표시

### 3. 블록 조합 패턴 학습
- 효과적인 블록 조합 패턴 저장
- AI에게 베스트 프랙티스 제공

### 4. 숏코드 자동 탐지
- `ShortcodeRenderer.tsx`를 스캔하여 자동으로 숏코드 목록 추출
- 수동 추가 불필요

## 관련 파일

```
apps/admin-dashboard/src/
├── services/ai/
│   ├── SimpleAIGenerator.ts          # AI 생성기 (메인)
│   └── block-registry-extractor.ts   # 블록/숏코드 추출기 (핵심)
├── scripts/
│   └── update-ai-docs.ts             # 문서 자동 업데이트
├── utils/
│   └── block-manager.ts              # 블록 매니저
└── components/
    ├── editor/blocks/                # 블록 컴포넌트
    └── shortcodes/                   # 숏코드 컴포넌트
        └── ShortcodeRenderer.tsx     # 숏코드 렌더러

docs/
└── manual/
    └── ai-page-generation.md         # 사용자 매뉴얼 (자동 생성)
```

## 참고

- [WordPress Block API](https://developer.wordpress.org/block-editor/reference-guides/block-api/)
- [Shortcode API](https://codex.wordpress.org/Shortcode_API)
- AI 모델별 프롬프트 최적화 가이드 (내부 문서)
