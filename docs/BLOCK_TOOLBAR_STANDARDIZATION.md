# 블록 툴바 표준화 조사 보고서

## 📋 목차
1. [현재 상황 분석](#현재-상황-분석)
2. [블록 패턴 비교](#블록-패턴-비교)
3. [문제점](#문제점)
4. [표준화 제안](#표준화-제안)
5. [마이그레이션 계획](#마이그레이션-계획)

---

## 🔍 현재 상황 분석

### 1. 두 가지 툴바 시스템 공존

#### A. 구식 툴바 (Legacy)
**위치:** `apps/admin-dashboard/src/components/editor/blocks/shared/BlockToolbar.tsx`

**특징:**
- 모든 기능이 하나의 거대한 컴포넌트에 집중
- 드래그 핸들, 블록 타입 선택, 정렬, 텍스트 포맷, 이동, 복사/삭제 등
- 모바일 반응형 포함
- 복잡하고 유지보수 어려움

**사용 블록:**
- (현재 거의 사용하지 않음 - 모든 블록이 `showToolbar={false}` 설정)

```typescript
// Legacy pattern (not recommended)
<EnhancedBlockWrapper
  showToolbar={true}  // Rarely used
  customToolbarContent={...}
>
  {children}
</EnhancedBlockWrapper>
```

---

#### B. Gutenberg 스타일 툴바 (Modern)
**위치:** `apps/admin-dashboard/src/components/editor/blocks/gutenberg/BlockToolbar.tsx`

**특징:**
- WordPress Gutenberg 스타일
- 깔끔하고 간결한 인터페이스
- 조건부 렌더링으로 필요한 기능만 표시
- 확장 가능한 구조 (children prop으로 커스텀 컨텐츠 추가)
- More 메뉴 (⋮)로 추가 옵션 제공

**사용 블록:**
- ✅ `ParagraphBlock`
- ✅ `ButtonBlock`
- ✅ `GutenbergHeadingBlock`

```typescript
// Modern Gutenberg pattern (recommended)
<EnhancedBlockWrapper
  showToolbar={false}  // Disable built-in toolbar
  slateEditor={editor}
  disableAutoFocus={true}
>
  {isSelected && hasContent && (
    <BlockToolbar
      align={align}
      onAlignChange={updateAttribute}
      isBold={isMarkActive(editor, 'bold')}
      onToggleBold={() => toggleMark(editor, 'bold')}
      onDuplicate={onDuplicate}
      onRemove={onDelete}
    />
  )}
  {children}
</EnhancedBlockWrapper>
```

---

### 2. 블록 래퍼 시스템

#### A. EnhancedBlockWrapper
**위치:** `apps/admin-dashboard/src/components/editor/blocks/EnhancedBlockWrapper.tsx`

**역할:**
- 블록 선택 상태 관리
- 키보드 단축키 처리
- 블록 추가 버튼 표시
- 드래그 앤 드롭 지원
- 자동 포커스 (Slate 에디터 지원)

**특징:**
- `variant` prop: `'simple'` | `'enhanced'` (기본: `'enhanced'`)
- `showToolbar`, `showAddButtons`, `enableKeyboardShortcuts` 세밀한 제어
- Slate.js 에디터와의 통합 (`slateEditor` prop)

```typescript
interface EnhancedBlockWrapperProps {
  // Core
  id: string;
  type: string;
  children: ReactNode;
  isSelected: boolean;
  onSelect: () => void;

  // Actions
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddBlock?: (position: 'before' | 'after') => void;

  // Toolbar customization
  customToolbarContent?: ReactNode;
  showToolbar?: boolean;  // Default: true
  showAddButtons?: boolean;  // Default: true
  enableKeyboardShortcuts?: boolean;  // Default: true

  // Slate.js support
  slateEditor?: BaseEditor & ReactEditor;
  disableAutoFocus?: boolean;

  // Variant
  variant?: 'simple' | 'enhanced';  // Default: 'enhanced'
}
```

---

#### B. SlateBlockWrapper
**위치:** `apps/admin-dashboard/src/components/editor/blocks/shared/SlateBlockWrapper.tsx`

**역할:**
- View/Edit 모드 전환
- 선택되지 않은 상태: HTML 렌더링 (view mode)
- 선택된 상태: Slate 에디터 (edit mode)

**문제점:**
- 현재 거의 사용되지 않음
- `ParagraphBlock`, `GutenbergHeadingBlock`는 이 래퍼를 사용하지 않음
- 대신 항상 Slate 에디터를 렌더링하고 선택 상태만 표시

```typescript
// SlateBlockWrapper pattern (rarely used now)
<SlateBlockWrapper
  isSelected={isSelected}
  value={value}
  serialize={serialize}
  viewModeStyle={{ textAlign: align }}
>
  <Slate editor={editor}>
    <Editable ... />
  </Slate>
</SlateBlockWrapper>
```

---

## 📊 블록 패턴 비교

### Pattern 1: 최신 Gutenberg 스타일 (권장)

**사용 블록:**
- `ParagraphBlock`
- `ButtonBlock`
- `GutenbergHeadingBlock`

**구조:**
```typescript
const MyBlock = ({ id, content, onChange, isSelected, ... }) => {
  // 1. Editor setup
  const editor = useMemo(() => createTextEditor(), []);
  const initialValue = useMemo(() => deserialize(content), []);

  // 2. State management
  const [hasContent, setHasContent] = useState(false);

  // 3. Event handlers
  const handleChange = useCallback((newValue) => {
    const html = serialize(newValue);
    onChange(html, attributes);
  }, [onChange, attributes]);

  const updateAttribute = useCallback((key, value) => {
    const html = serialize(editor.children);
    onChange(html, { ...attributes, [key]: value });
  }, [onChange, attributes, editor]);

  // 4. Keyboard shortcuts
  const handleKeyDown = useSlateKeyboard({
    editor,
    handleEnterKey,
    handleBackspaceKey,
  });

  return (
    <EnhancedBlockWrapper
      id={id}
      type="paragraph"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onAddBlock={onAddBlock}
      slateEditor={editor}
      disableAutoFocus={true}
      showToolbar={false}  // 👈 핵심: 내장 툴바 비활성화
    >
      {/* 조건부 Gutenberg 툴바 */}
      {isSelected && hasContent && (
        <BlockToolbar
          align={align}
          onAlignChange={(newAlign) => updateAttribute('align', newAlign)}
          isBold={isMarkActive(editor, 'bold')}
          isItalic={isMarkActive(editor, 'italic')}
          onToggleBold={() => toggleMark(editor, 'bold')}
          onToggleItalic={() => toggleMark(editor, 'italic')}
          onDuplicate={onDuplicate}
          onRemove={onDelete}
        />
      )}

      {/* Slate 에디터 */}
      <Slate editor={editor} initialValue={initialValue} onValueChange={handleChange}>
        <Editable
          renderElement={renderElement}
          renderLeaf={DefaultLeafRenderer}
          onKeyDown={handleKeyDown}
        />
      </Slate>
    </EnhancedBlockWrapper>
  );
};
```

**장점:**
- ✅ 깔끔한 구조
- ✅ Gutenberg 스타일 UI
- ✅ 조건부 툴바 (hasContent 체크)
- ✅ Slate.js와 완벽한 통합
- ✅ 키보드 단축키 지원
- ✅ 확장 가능 (children prop으로 커스텀 컨텐츠 추가)

**단점:**
- ⚠️ 각 블록이 비슷한 boilerplate 코드 반복
- ⚠️ hasContent 로직 중복

---

### Pattern 2: Legacy EnhancedBlockWrapper 툴바

**사용 블록:**
- (현재 거의 없음)

**구조:**
```typescript
<EnhancedBlockWrapper
  id={id}
  type="paragraph"
  isSelected={isSelected}
  onSelect={onSelect}
  showToolbar={true}  // 👈 내장 툴바 사용
  onAlignChange={onAlignChange}
  currentAlign={align}
  onToggleBold={onToggleBold}
  onToggleItalic={onToggleItalic}
  customToolbarContent={<CustomButtons />}
>
  {children}
</EnhancedBlockWrapper>
```

**문제점:**
- ❌ 복잡한 인터페이스 (너무 많은 props)
- ❌ 유지보수 어려움
- ❌ 확장성 낮음
- ❌ 현재 거의 사용하지 않음

---

### Pattern 3: 다양한 혼합 패턴

**문제 블록들:**
- `EnhancedImageBlock`
- `EnhancedGalleryBlock`
- `EnhancedCoverBlock`
- `TableBlock`
- `SocialIconsBlock`
- 기타 오래된 블록들

**현상:**
- 각자 다른 방식으로 툴바 구현
- 일부는 커스텀 툴바, 일부는 사이드바 패널
- 일관성 없음

---

## ❌ 문제점

### 1. 일관성 부족
- 블록마다 다른 툴바 패턴 사용
- 사용자 경험 일관성 저하
- 개발자 혼란

### 2. 코드 중복
- 비슷한 툴바 코드가 여러 블록에 반복
- `hasContent` 체크 로직 중복
- `updateAttribute` 패턴 중복
- Slate 에디터 설정 중복

### 3. 유지보수 어려움
- 툴바 수정 시 모든 블록 개별 수정 필요
- 버그 수정이 어려움
- 새로운 기능 추가 어려움

### 4. 문서화 부족
- 어떤 패턴을 사용해야 하는지 불명확
- 새로운 블록 개발 시 참고할 가이드 없음

---

## ✅ 표준화 제안

### 1. Gutenberg 스타일을 공식 표준으로 채택

**이유:**
- WordPress 생태계 표준
- 깔끔하고 직관적인 UI
- 현재 최신 블록들이 이미 사용 중
- 확장 가능한 구조

### 2. 공통 Hooks 생성

#### A. `useBlockToolbar` Hook

```typescript
// hooks/useBlockToolbar.ts
export const useBlockToolbar = (editor: Editor) => {
  const [hasContent, setHasContent] = useState(false);

  const updateContentState = useCallback(() => {
    const hasText = editor.children.some(node => {
      if (SlateElement.isElement(node)) {
        return node.children.some(child =>
          Text.isText(child) && child.text.trim().length > 0
        );
      }
      return false;
    });
    setHasContent(hasText);
  }, [editor]);

  return { hasContent, updateContentState };
};
```

#### B. `useBlockAttributes` Hook

```typescript
// hooks/useBlockAttributes.ts
export const useBlockAttributes = (
  editor: Editor,
  onChange: (content: string, attributes?: any) => void,
  attributes: any
) => {
  const updateAttribute = useCallback((key: string, value: any) => {
    const html = serialize(editor.children);
    onChange(html, { ...attributes, [key]: value });
  }, [onChange, attributes, editor]);

  return { updateAttribute };
};
```

#### C. `useSlateBlock` Hook (통합)

```typescript
// hooks/useSlateBlock.ts
export const useSlateBlock = (options: SlateBlockOptions) => {
  const {
    content,
    attributes,
    onChange,
    onDelete,
    onAddBlock,
    blockType = 'paragraph',
  } = options;

  // Editor setup
  const editor = useMemo(() => createTextEditor(), []);
  const initialValue = useMemo(() => {
    const text = (typeof content === 'string' && content) || attributes.content || '';
    return deserialize(text) || defaultEmptyValue(blockType);
  }, []);

  // Content state
  const { hasContent, updateContentState } = useBlockToolbar(editor);

  // Attributes
  const { updateAttribute } = useBlockAttributes(editor, onChange, attributes);

  // Change handler
  const handleChange = useCallback((newValue: Descendant[]) => {
    updateContentState();
    const isAstChange = editor.operations.some(op => op.type !== 'set_selection');
    if (isAstChange) {
      const html = serialize(newValue);
      onChange(html, attributes);
    }
  }, [editor, onChange, attributes, updateContentState]);

  // Keyboard handlers
  const handleEnterKey = useMemo(
    () => createBlockEnterHandler({ editor, onChange, onAddBlock, attributes }),
    [editor, onChange, onAddBlock, attributes]
  );

  const handleBackspaceKey = useMemo(
    () => createBlockBackspaceHandler({ editor, onDelete }),
    [editor, onDelete]
  );

  const handleKeyDown = useSlateKeyboard({
    editor,
    handleEnterKey,
    handleBackspaceKey,
  });

  return {
    editor,
    initialValue,
    hasContent,
    handleChange,
    handleKeyDown,
    updateAttribute,
  };
};
```

### 3. 표준 블록 템플릿

```typescript
// components/editor/blocks/templates/StandardTextBlock.tsx
interface StandardTextBlockProps {
  id: string;
  content?: string | object;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: StandardTextBlockAttributes;
  blockType: 'paragraph' | 'heading';
  renderElement: (props: RenderElementProps) => JSX.Element;
  className?: string;
  placeholder?: string;
}

export const StandardTextBlock: React.FC<StandardTextBlockProps> = ({
  id,
  content,
  onChange,
  onDelete,
  onDuplicate,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {},
  blockType,
  renderElement,
  className,
  placeholder,
}) => {
  const {
    editor,
    initialValue,
    hasContent,
    handleChange,
    handleKeyDown,
    updateAttribute,
  } = useSlateBlock({
    content,
    attributes,
    onChange,
    onDelete,
    onAddBlock,
    blockType,
  });

  return (
    <EnhancedBlockWrapper
      id={id}
      type={blockType}
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onAddBlock={onAddBlock}
      className={className}
      slateEditor={editor}
      disableAutoFocus={true}
      showToolbar={false}
    >
      {isSelected && hasContent && (
        <BlockToolbar
          align={attributes.align}
          onAlignChange={(newAlign) => updateAttribute('align', newAlign)}
          isBold={isMarkActive(editor, 'bold')}
          isItalic={isMarkActive(editor, 'italic')}
          onToggleBold={() => toggleMark(editor, 'bold')}
          onToggleItalic={() => toggleMark(editor, 'italic')}
          onDuplicate={onDuplicate}
          onRemove={onDelete}
        />
      )}

      <Slate
        editor={editor}
        initialValue={initialValue}
        onValueChange={handleChange}
      >
        <Editable
          renderElement={renderElement}
          renderLeaf={DefaultLeafRenderer}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          style={{ outline: 'none', minHeight: '1.5em' }}
        />
      </Slate>
    </EnhancedBlockWrapper>
  );
};
```

### 4. 표준화된 블록 개발 가이드

#### 새 블록 생성 체크리스트

- [ ] `EnhancedBlockWrapper` 사용
- [ ] `showToolbar={false}` 설정
- [ ] Gutenberg `BlockToolbar` 조건부 렌더링
- [ ] `hasContent` 체크 구현
- [ ] Slate 에디터는 `useSlateBlock` hook 사용
- [ ] 키보드 단축키 구현 (`useSlateKeyboard`)
- [ ] Enter/Backspace 핸들러 구현
- [ ] `updateAttribute` 패턴 사용
- [ ] TypeScript 인터페이스 정의
- [ ] Props 문서화 (JSDoc)

---

## 🔄 마이그레이션 계획

### Phase 1: 공통 인프라 구축 (1-2일)

**작업:**
1. `useSlateBlock` hook 생성
2. `StandardTextBlock` 템플릿 생성
3. 개발 가이드 문서 작성
4. 예제 블록 작성

**우선순위:** 높음

---

### Phase 2: 핵심 텍스트 블록 표준화 (1일)

**대상 블록:**
- ✅ `ParagraphBlock` (이미 표준)
- ✅ `GutenbergHeadingBlock` (이미 표준)
- [ ] `QuoteBlock`
- [ ] `ListBlock`
- [ ] `CodeBlock`

**작업:**
- `useSlateBlock` hook 적용
- 중복 코드 제거
- 일관성 검증

**우선순위:** 높음

---

### Phase 3: 미디어 블록 표준화 (2-3일)

**대상 블록:**
- [ ] `EnhancedImageBlock`
- [ ] `EnhancedGalleryBlock`
- [ ] `EnhancedCoverBlock`
- [ ] `VideoBlock`

**작업:**
- Gutenberg 툴바 적용
- 커스텀 컨트롤 패널 표준화
- 일관된 UI/UX

**우선순위:** 중간

---

### Phase 4: 레이아웃 블록 표준화 (1-2일)

**대상 블록:**
- [ ] `ColumnsBlock`
- [ ] `GroupBlock`
- [ ] `SpacerBlock`

**작업:**
- 툴바 패턴 통일
- 중첩 블록 처리 표준화

**우선순위:** 중간

---

### Phase 5: 특수 블록 표준화 (2-3일)

**대상 블록:**
- ✅ `ButtonBlock` (이미 표준)
- [ ] `TableBlock`
- [ ] `SocialIconsBlock`
- [ ] `FormFieldBlock`
- [ ] `FormSubmitBlock`

**작업:**
- 각 블록의 특수성 고려한 표준화
- 커스텀 툴바 컨텐츠 활용

**우선순위:** 낮음

---

### Phase 6: Legacy 코드 제거 (1일)

**작업:**
- `shared/BlockToolbar.tsx` 사용처 확인
- 미사용 코드 제거
- 문서 업데이트

**우선순위:** 낮음

---

## 📝 개발 가이드

### 새로운 텍스트 블록 만들기

```typescript
import { StandardTextBlock } from '../templates/StandardTextBlock';

const MyTextBlock: React.FC<MyTextBlockProps> = (props) => {
  const renderElement = useCallback((renderProps: RenderElementProps) => {
    return (
      <p
        {...renderProps.attributes}
        style={{ textAlign: props.attributes.align }}
      >
        {renderProps.children}
      </p>
    );
  }, [props.attributes.align]);

  return (
    <StandardTextBlock
      {...props}
      blockType="paragraph"
      renderElement={renderElement}
      placeholder="Type something..."
    />
  );
};
```

### 새로운 커스텀 블록 만들기

```typescript
const MyCustomBlock: React.FC<MyCustomBlockProps> = ({
  id,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  ...props
}) => {
  return (
    <EnhancedBlockWrapper
      id={id}
      type="my-custom-block"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      showToolbar={false}
    >
      {isSelected && (
        <BlockToolbar
          align={props.align}
          onAlignChange={handleAlignChange}
          onDuplicate={onDuplicate}
          onRemove={onDelete}
        >
          {/* 커스텀 툴바 버튼 */}
          <button onClick={handleCustomAction}>
            <CustomIcon />
          </button>
        </BlockToolbar>
      )}

      {/* 블록 컨텐츠 */}
      <div className="my-custom-content">
        {props.children}
      </div>
    </EnhancedBlockWrapper>
  );
};
```

---

## 📚 참고 자료

### 내부 문서
- `apps/admin-dashboard/src/components/editor/blocks/ParagraphBlock.tsx` - 모범 예시
- `apps/admin-dashboard/src/components/editor/blocks/ButtonBlock.tsx` - 모범 예시
- `apps/admin-dashboard/src/components/editor/blocks/gutenberg/GutenbergHeadingBlock.tsx` - 모범 예시

### 외부 참고
- [WordPress Gutenberg Block Editor Handbook](https://developer.wordpress.org/block-editor/)
- [Slate.js Documentation](https://docs.slatejs.org/)

---

## 🎯 요약

### 현재 상황
- ❌ 두 가지 툴바 시스템 공존 (Legacy vs Gutenberg)
- ❌ 블록마다 다른 패턴 사용
- ❌ 코드 중복 많음

### 목표
- ✅ Gutenberg 스타일 단일 표준 확립
- ✅ 공통 hooks와 템플릿으로 중복 제거
- ✅ 일관된 사용자 경험
- ✅ 유지보수 용이성 향상

### 다음 단계
1. `useSlateBlock` hook 구현
2. `StandardTextBlock` 템플릿 생성
3. 핵심 블록부터 순차적으로 마이그레이션
4. Legacy 코드 제거

---

*작성일: 2025-11-14*
*작성자: Claude Code*
*버전: 1.0*
