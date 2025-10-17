# 📦 O4O Platform 블록 개발 가이드

**최종 업데이트**: 2025-10-17
**버전**: 2.0 (Slate.js 기반 재구성)

---

## 📑 목차

1. [개요](#개요)
2. [Slate.js 기반 에디터](#slate-js-기반-에디터)
3. [블록 아키텍처](#블록-아키텍처)
4. [블록 구현 현황](#블록-구현-현황)
5. [블록 개발 가이드](#블록-개발-가이드)
6. [성능 최적화](#성능-최적화)
7. [마이그레이션 계획](#마이그레이션-계획)

---

## 개요

O4O Platform은 **Gutenberg 호환** 블록 에디터를 사용합니다. 2025년 10월부터 Slate.js 기반으로 재구성하여 다음을 달성했습니다:

- ✅ **의존성 최적화**: -94 packages (Tiptap 제거, Slate 추가)
- ✅ **CONTROLLED 패턴**: 브라우저 네이티브 Selection API 신뢰
- ✅ **플러그인 아키텍처**: 모듈화된 기능 확장
- ✅ **TypeScript 엄격 모드**: 타입 안전성 100%

---

## Slate.js 기반 에디터

### 구현 완료 (Phase 1)

**설치된 패키지**:
```json
{
  "slate": "0.118.1",
  "slate-react": "0.117.4",
  "slate-history": "0.113.1"
}
```

**파일 구조**:
```
src/components/editor/slate/
├── SlateEditor.tsx              # Main editor component
├── types/
│   └── slate-types.ts          # TypeScript definitions
├── components/
│   └── Toolbar.tsx             # Bold/Italic toolbar
├── plugins/
│   ├── withParagraphs.ts       # Enter key (block split)
│   └── withDeleteKey.ts        # Backspace key (block merge)
└── utils/
    └── serialize.ts            # HTML conversion utilities
```

### 구현된 기능

**텍스트 편집**:
- ✅ Paragraph 블록
- ✅ 텍스트 입력 & 커서 이동
- ✅ Undo/Redo (Ctrl/Cmd + Z/Shift+Z)
- ✅ 브라우저 네이티브 Selection

**포맷팅**:
- ✅ Bold (Ctrl/Cmd + B)
- ✅ Italic (Ctrl/Cmd + I)
- ✅ 도구모음 버튼
- ✅ 활성 상태 표시

**블록 동작**:
- ✅ Enter: 단락 분할
- ✅ Backspace: 단락 병합
- ✅ Alignment 지원 (left/center/right/justify)

**데이터 변환**:
- ✅ Slate JSON → HTML
- ✅ HTML → Slate JSON
- ✅ Gutenberg 호환

### 플러그인 체인

```typescript
const editor = useMemo(
  () => withDeleteKey(withParagraphs(withHistory(withReact(createEditor())))),
  []
);
```

**플러그인 역할**:
1. `withReact`: React & DOM 통합
2. `withHistory`: Undo/Redo 지원
3. `withParagraphs`: Enter 키 블록 분할
4. `withDeleteKey`: Backspace 키 블록 병합

### TypeScript 타입 정의

```typescript
// CustomElement (Block-level)
type ParagraphElement = {
  type: 'paragraph';
  align?: 'left' | 'center' | 'right' | 'justify';
  children: CustomText[];
};

// CustomText (Inline formatting)
type FormattedText = {
  text: string;
  bold?: true;
  italic?: true;
};

// Extend Slate's CustomTypes
declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}
```

### HTML 직렬화

```typescript
// Slate JSON → HTML
export const serialize = (nodes: Descendant[]): string => {
  return nodes.map(node => serializeNode(node)).join('');
};

// HTML → Slate JSON
export const deserialize = (html: string): Descendant[] => {
  const document = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(document.body.childNodes)
    .map(node => deserializeNode(node))
    .filter(node => node !== null);
};
```

### Phase 2 계획 (다음 단계)

**추가 기능**:
- ⏳ Link 지원 (Ctrl/Cmd + K)
- ⏳ 텍스트/배경 색상
- ⏳ 폰트 크기 제어
- ⏳ 추가 마크 (underline, strikethrough)

**추가 블록 타입**:
- ⏳ Heading (H1-H6)
- ⏳ List (Ordered/Unordered)
- ⏳ Quote
- ⏳ Code

---

## 블록 아키텍처

### 플러그인 그룹화 전략

```
@o4o/blocks-core (필수)
├── paragraph (Slate.js)
├── heading (Slate.js)
├── list (Slate.js)
├── quote (Slate.js)
└── code (Slate.js)

@o4o/blocks-layout
├── columns
├── group
├── spacer
├── separator
└── cover

@o4o/blocks-media
├── image
├── gallery
├── video
├── audio
└── embed

@o4o/blocks-interactive
├── button
├── search
├── table
└── forms

@o4o/blocks-site
├── header
├── footer
├── navigation
├── logo
└── social

@o4o/blocks-advanced
├── shortcode
├── reusable
├── cpt-acf
└── spectra
```

### 동적 로딩 시스템

```typescript
export class DynamicBlockLoader {
  async loadPlugin(pluginId: string): Promise<BlockPlugin> {
    return import(
      /* webpackChunkName: "[request]" */
      `@o4o/blocks-${pluginId}`
    );
  }

  async preloadEssentials(): Promise<void> {
    await this.loadPlugin('core');
  }
}
```

---

## 블록 구현 현황

### 구현 완료율

**전체**: 23개 중 10개 완료 (43.5%)

| 카테고리 | 완료율 | 상태 |
|----------|--------|------|
| 텍스트 | 100% (5/5) | 🟢 |
| 미디어 | 25% (1/4) | 🔴 |
| 디자인 | 40% (2/5) | 🟡 |
| 전자상거래 | 0% (0/3) | 🔴 |
| 사이트 | 0% (0/2) | 🔴 |
| 데이터 | 0% (0/2) | 🔴 |

### 블록별 상세 현황

| 블록 | 구현 | 등록 | 작동 | 상태 | 비고 |
|------|------|------|------|------|------|
| **텍스트 블록** |
| paragraph | ✅ Slate.js | ✅ | ✅ | 🟢 | Phase 1 완료 |
| heading | ✅ | ✅ | ✅ | 🟢 | 3개 버전 → 통합 필요 |
| list | ✅ | ✅ | ✅ | 🟢 | 2개 버전 → 통합 필요 |
| quote | ✅ | ✅ | ✅ | 🟢 | |
| code | ✅ | ✅ | ✅ | 🟢 | |
| **미디어 블록** |
| image | ✅ | ✅ | ✅ | 🟢 | 2개 버전 → 통합 필요 |
| gallery | ❌ | ❌ | ❌ | 🔴 | 구현 필요 |
| video | ❌ | ✅ | ❌ | 🔴 | 구현 필요 |
| audio | ❌ | ✅ | ❌ | 🔴 | 구현 필요 |
| **디자인 블록** |
| button | ✅ | ✅ | ✅ | 🟢 | |
| columns | ✅ | ✅ | ✅ | 🟢 | |
| spacer | ❌ | ✅ | ❌ | 🔴 | 구현 필요 |
| separator | ❌ | ✅ | ❌ | 🔴 | 구현 필요 |
| group | ✅ | ✅ | ❓ | 🟡 | 매핑 필요 |

### 중복 구현 정리 필요

- **Heading**: 3개 버전 → Slate.js 기반 통합
- **Paragraph**: 2개 버전 → Slate.js로 교체 완료
- **Image**: 2개 버전 → Enhanced 버전으로 통합
- **List**: 2개 버전 → Slate.js 기반 통합

---

## 블록 개발 가이드

### 1. Slate.js 기반 블록 개발

**템플릿**:

```typescript
// MyBlock.tsx
import React from 'react';
import { RenderElementProps } from 'slate-react';

export interface MyBlockElement {
  type: 'my-block';
  // 블록 전용 속성
  customProp?: string;
  children: CustomText[];
}

export const MyBlock: React.FC<RenderElementProps> = ({
  attributes,
  children,
  element
}) => {
  const myElement = element as MyBlockElement;

  return (
    <div {...attributes} className="my-block">
      {children}
    </div>
  );
};
```

**타입 확장**:

```typescript
// slate-types.ts
export type CustomElement =
  | ParagraphElement
  | MyBlockElement  // 추가
  | HeadingElement;
```

**플러그인 추가**:

```typescript
// withMyBlock.ts
export const withMyBlock = (editor: Editor): Editor => {
  const { insertBreak } = editor;

  editor.insertBreak = () => {
    // 커스텀 동작
    insertBreak();
  };

  return editor;
};
```

### 2. 렌더링 등록

```typescript
// SlateEditor.tsx
const renderElement = useCallback((props: RenderElementProps) => {
  switch (props.element.type) {
    case 'paragraph':
      return <ParagraphElement {...props} />;
    case 'my-block':
      return <MyBlock {...props} />;
    default:
      return <DefaultElement {...props} />;
  }
}, []);
```

### 3. HTML 직렬화 추가

```typescript
// serialize.ts
const serializeNode = (node: Descendant): string => {
  if (Text.isText(node)) {
    return serializeText(node);
  }

  const element = node as CustomElement;
  const children = element.children.map(n => serializeNode(n)).join('');

  switch (element.type) {
    case 'my-block':
      return `<div class="my-block">${children}</div>`;
    default:
      return children;
  }
};
```

### 4. 키보드 단축키 추가

```typescript
// SlateEditor.tsx
const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
  const isModKey = event.ctrlKey || event.metaKey;

  if (isModKey && event.key === 'm') {
    event.preventDefault();
    // MyBlock 삽입 로직
  }
}, [editor]);
```

---

## 성능 최적화

### 번들 크기 비교

**Before (Tiptap)**:
- vendor-tiptap: ~500KB
- 총 의존성: 1,885 packages

**After (Slate.js)**:
- No vendor-slate chunk (통합)
- 총 의존성: 1,896 packages (+32 -126 = -94 net)
- 빌드 시간: 12초 (3,565 modules)

### Code Splitting 전략

```javascript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('@o4o/blocks-core')) {
            return 'blocks-core'; // 필수
          }
          if (id.includes('@o4o/blocks-media')) {
            return 'blocks-media'; // 선택적 로드
          }
          if (id.includes('@o4o/blocks-advanced')) {
            return 'blocks-advanced'; // 선택적 로드
          }
        }
      }
    }
  }
};
```

### 목표 번들 크기

```
Initial Load:
  - blocks-core: 200KB (필수)

On Demand:
  - blocks-layout: 150KB
  - blocks-media: 400KB
  - blocks-interactive: 300KB
  - blocks-advanced: 500KB
```

---

## 마이그레이션 계획

### Phase 1: Slate.js 기반 구축 ✅ (완료)

**기간**: 2025-10-17
- ✅ Slate.js 패키지 설치
- ✅ 타입 정의
- ✅ Paragraph 블록 (Bold, Italic)
- ✅ Enter/Backspace 키 동작
- ✅ HTML 직렬화/역직렬화

### Phase 2: 기본 블록 확장 ⏳ (진행중)

**기간**: 2-3주
- ⏳ Heading 블록 (H1-H6)
- ⏳ List 블록 (Ordered/Unordered)
- ⏳ Quote 블록
- ⏳ Link 지원
- ⏳ 색상 & 폰트 크기

### Phase 3: 미디어 블록 (예정)

**기간**: 2-3주
- Gallery 블록
- Video 블록
- Audio 블록
- Embed 블록

### Phase 4: 레이아웃 블록 (예정)

**기간**: 2-3주
- Columns 블록 (Slate 통합)
- Group 블록
- Spacer 블록
- Cover 블록

### Phase 5: 통합 & 최적화 (예정)

**기간**: 2-3주
- 중복 블록 제거
- 성능 벤치마킹
- 플러그인 아키텍처 완성
- 번들 크기 최적화

---

## 참고 자료

### Slate.js
- [Official Documentation](https://docs.slatejs.org)
- [GitHub Repository](https://github.com/ianstormtaylor/slate)
- [TypeScript Guide](https://docs.slatejs.org/concepts/12-typescript)

### Gutenberg
- [Block Editor Handbook](https://developer.wordpress.org/block-editor/)
- [Block API Reference](https://developer.wordpress.org/block-editor/reference-guides/block-api/)

### Performance
- [Vite Code Splitting](https://vitejs.dev/guide/build.html#chunking-strategy)
- [React Performance](https://reactjs.org/docs/optimizing-performance.html)

---

## 기여 가이드

### 새 블록 추가 절차

1. **타입 정의 추가** (`slate-types.ts`)
2. **블록 컴포넌트 작성** (`blocks/MyBlock.tsx`)
3. **렌더러 등록** (`SlateEditor.tsx`)
4. **직렬화 로직 추가** (`serialize.ts`)
5. **플러그인 작성** (필요시)
6. **테스트 작성**
7. **문서 업데이트**

### 코드 리뷰 체크리스트

- [ ] TypeScript 타입 체크 통과
- [ ] 빌드 성공
- [ ] HTML 직렬화/역직렬화 테스트
- [ ] Gutenberg 호환성 확인
- [ ] 성능 영향 분석
- [ ] 문서 업데이트

---

*최종 업데이트: 2025-10-17*
*작성자: O4O Platform Development Team*
*기반: Slate.js 0.118.1*
