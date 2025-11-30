# 🤖 대화형 편집기 가이드

**버전**: 1.0.0
**최종 업데이트**: 2025-10-21

---

## 📑 목차

1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [사용 가이드](#사용-가이드)
4. [AI 프롬프트 작성법](#ai-프롬프트-작성법)
5. [개발자 가이드](#개발자-가이드)
6. [문제 해결](#문제-해결)

---

## 개요

### 대화형 편집기란?

대화형 편집기는 AI 어시스턴트와 **자연어로 대화하며** 블록을 추가, 수정, 삭제할 수 있는 혁신적인 편집 인터페이스입니다.

### 핵심 개념

```
클릭 기반 편집기: 유저 클릭 → UI 이벤트 핸들러 → dispatch(action)
대화형 편집기:   유저 대화 → LLM 파서 → JSON 객체(명령) → dispatch(action)
```

### 주요 기능

- ✅ **Context-Aware**: AI가 편집기 상태를 실시간 인식
- ✅ **Action Dispatch**: AI 명령을 편집기 API로 자동 변환
- ✅ **CPT 인식**: Custom Post Type 자동 지원
- ✅ **Universal Form**: Post/CPT 통합 폼 블록

---

## 아키텍처

### 시스템 구조

```
┌─────────────┐
│ 사용자 입력 │
│ "제목 추가" │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ ConversationalAI    │
│ - EditorContext 읽기│
│ - LLM 호출          │
│ - 액션 파싱         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ AIAction[]          │
│ {action, target...} │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ executeAIActions()  │
│ - insert            │
│ - update            │
│ - delete            │
│ - ...               │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ 편집기 API          │
│ - handleInsertBlock │
│ - handleBlockUpdate │
│ - handleBlockDelete │
└─────────────────────┘
```

### 핵심 컴포넌트

#### 1. ConversationalAI Service

**파일**: `/services/ai/ConversationalAI.ts`

```typescript
interface EditorContext {
  selectedBlockId: string | null;
  selectedBlock: Block | null;
  allBlocks: Block[];
  documentTitle: string;
  blockCount: number;
}

interface AIAction {
  action: 'insert' | 'update' | 'delete' | 'replace' | 'move' | 'duplicate';
  targetBlockId?: string;
  position?: 'before' | 'after' | number;
  blockType?: string;
  content?: any;
  attributes?: Record<string, any>;
}

class ConversationalAI {
  async chat(
    userInput: string,
    context: EditorContext,
    config: AIConfig
  ): Promise<AIResponse>;
}
```

#### 2. AIChatPanel Component

**파일**: `/components/editor/AIChatPanel.tsx`

```typescript
interface AIChatPanelProps {
  editorContext: EditorContext;
  onExecuteActions: (actions: AIAction[]) => void;
  config: AIConfig;
}
```

**기능**:
- 채팅 UI
- 메시지 히스토리
- Quick Suggestions
- Action 실행 버튼

#### 3. GutenbergBlockEditor 통합

**파일**: `/components/editor/GutenbergBlockEditor.tsx`

```typescript
// EditorContext 생성
const editorContext: EditorContext = useMemo(() => ({
  selectedBlockId,
  selectedBlock: blocks.find(b => b.id === selectedBlockId) || null,
  allBlocks: blocks.filter(b => b.type !== 'o4o/block-appender'),
  documentTitle,
  blockCount: blocks.filter(b => b.type !== 'o4o/block-appender').length,
}), [selectedBlockId, blocks, documentTitle]);

// 액션 실행
const handleExecuteAIActions = useCallback((actions: AIAction[]) => {
  actions.forEach(action => {
    switch (action.action) {
      case 'insert':
        // 블록 삽입 로직
        break;
      case 'update':
        handleBlockUpdate(action.targetBlockId, action.content, action.attributes);
        break;
      // ...
    }
  });
}, [blocks, updateBlocks, ...]);
```

---

## 사용 가이드

### 시작하기

1. **AI Chat 패널 열기**
   - 편집기 상단 "AI Chat" 버튼 클릭
   - 또는 키보드 단축키: `Ctrl/Cmd + Shift + A` (예정)

2. **명령 입력**
   - 자연어로 원하는 작업 입력
   - 예: "제목 블록 추가해줘"

3. **AI 응답 확인**
   - AI가 생성한 액션 확인
   - "상세 보기"로 JSON 액션 확인 가능

4. **액션 실행**
   - "액션 실행" 버튼 클릭
   - 편집기에 자동 반영

### Quick Suggestions

자주 사용하는 명령을 빠르게 입력할 수 있는 버튼:

- **제목 추가** - "제목 블록 추가해줘"
- **블록 삭제** - "선택된 블록 삭제해줘"
- **이미지 추가** - "이미지 블록 추가해줘"

---

## AI 프롬프트 작성법

### 명확한 명령어 작성

✅ **좋은 예시**:
```
- "선택된 블록 아래에 제목 추가해줘"
- "이미지 블록을 삭제해줘"
- "맨 위에 단락 블록 추가"
- "이 블록을 버튼으로 바꿔줘"
```

❌ **나쁜 예시**:
```
- "저기 바꿔줘" (모호함)
- "좀 더 예쁘게" (주관적)
- "수정해줘" (구체적이지 않음)
```

### 위치 지정

**절대 위치**:
- "맨 위에" → position: 0
- "맨 아래에" → position: blockCount

**상대 위치**:
- "선택된 블록 위에" → position: 'before', targetBlockId: selectedBlockId
- "선택된 블록 아래에" → position: 'after', targetBlockId: selectedBlockId

**지시어**:
- "이거" "저거" → selectedBlockId 사용
- "새로 추가" → selectedBlockId 뒤에 insert

### 블록 타입 지정

```
- "제목" → o4o/heading
- "단락" → o4o/paragraph
- "이미지" → o4o/image
- "버튼" → o4o/button
- "폼" → o4o/universal-form
```

### CPT 폼 생성

```
User: "드롭쉬핑 상품 등록 폼 만들어줘"

AI 이해:
- postType: ds_product
- blockType: o4o/universal-form
- innerBlocks: [form-field (title, price, stock), form-submit]
```

---

## 개발자 가이드

### 새 AI 액션 타입 추가

#### 1. AIAction 타입 확장

```typescript
// ConversationalAI.ts
export type AIActionType =
  | 'insert'
  | 'update'
  | 'delete'
  | 'replace'
  | 'move'
  | 'duplicate'
  | 'transform'
  | 'my-custom-action'; // ← 추가
```

#### 2. executeAIActions에 핸들러 추가

```typescript
// GutenbergBlockEditor.tsx
const handleExecuteAIActions = useCallback((actions: AIAction[]) => {
  actions.forEach(action => {
    switch (action.action) {
      // ... 기존 케이스들
      case 'my-custom-action':
        // 커스텀 로직
        handleMyCustomAction(action);
        break;
    }
  });
}, [...]);
```

#### 3. AI 시스템 프롬프트 업데이트

```typescript
// ConversationalAI.ts
private buildSystemPrompt(context: EditorContext): string {
  return `
  ...
  **action 타입:**
  - insert: 새 블록 삽입
  - update: 기존 블록 수정
  - my-custom-action: 나만의 커스텀 액션 // ← 추가
  ...
  `;
}
```

### CPT Reference 확장

새로운 CPT를 AI가 인식하도록 하려면:

#### 1. CPT 등록

```typescript
// Backend: cpt.types 테이블에 추가
{
  slug: 'my_custom_cpt',
  label: '내 커스텀 CPT',
  description: '설명',
  fields: [
    { name: 'custom_field', type: 'text' }
  ]
}
```

#### 2. 자동 인식

```typescript
// reference-fetcher.service.ts가 자동으로:
// GET /cpt/types?active=true 호출
// → AI 프롬프트에 자동 주입
```

#### 3. AI 사용

```
User: "내 커스텀 CPT 폼 만들어줘"

AI 자동 생성:
{
  "type": "o4o/universal-form",
  "attributes": { "postType": "my_custom_cpt" }
}
```

### AI 모델 변경

```typescript
// AIChatPanel.tsx
<AIChatPanel
  editorContext={editorContext}
  onExecuteActions={handleExecuteAIActions}
  config={{
    provider: 'gemini',         // 'openai' | 'claude'
    model: 'gemini-2.5-flash'   // 원하는 모델
  }}
/>
```

---

## 문제 해결

### AI가 CPT를 인식하지 못함

**원인**: CPT Reference API가 실패했거나 CPT가 비활성화됨

**해결**:
1. 브라우저 콘솔 확인: `⚠️ CPT 참조 데이터 로드 실패`
2. CPT 활성화 확인: `/cpt/types?active=true` 응답 확인
3. 권한 확인: 로그인 토큰 유효성 확인

### AI 응답이 JSON이 아님

**원인**: LLM이 텍스트로 응답

**해결**:
```typescript
// ConversationalAI.ts - parseAIResponse()가 자동 처리
// ```json ... ``` 또는 {...} 추출
```

### 액션 실행 후 편집기가 업데이트되지 않음

**원인**: React state 업데이트 누락

**해결**:
```typescript
// GutenbergBlockEditor.tsx
updateBlocks(newBlocks);    // ← 이 함수 호출 필수
setSelectedBlockId(newId);  // ← 선택 상태 업데이트
```

### CPT 폼이 제출되지 않음

**원인**: cptPostApi 라우팅 오류

**해결**:
1. Network 탭 확인: `POST /cpt/{slug}/posts` 호출 확인
2. Backend 로그 확인
3. UniversalFormBlock.tsx:174 확인

---

## 향후 계획

### Phase 4.5: 고도화 (예정)

- [ ] **Multi-step Workflows**: 복잡한 작업을 단계별로 실행
- [ ] **History 저장**: AI 대화 히스토리 저장/복원
- [ ] **Undo/Redo**: AI 액션 되돌리기
- [ ] **Voice Input**: 음성 명령 지원
- [ ] **Keyboard Shortcuts**: `Ctrl+Shift+A`로 AI Chat 열기

### Phase 5: 자동화 (예정)

- [ ] **Page Templates**: "랜딩 페이지 만들어줘" → 전체 레이아웃 생성
- [ ] **Content Suggestions**: AI가 콘텐츠 개선 제안
- [ ] **SEO Optimization**: AI가 SEO 최적화 제안
- [ ] **A/B Testing**: AI가 A/B 테스트 변형 생성

---

## 참고 자료

### 관련 문서
- [블록 참조 가이드](/docs/manual/blocks-reference.md)
- [블록 개발 가이드](/BLOCKS_DEVELOPMENT.md)
- [Universal Form Block 가이드](#)

### 외부 리소스
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Gemini Tool Use](https://ai.google.dev/gemini-api/docs/function-calling)
- [Claude Tool Use](https://docs.anthropic.com/claude/docs/tool-use)

---

*최종 업데이트: 2025-10-21*
*작성자: O4O Platform Development Team*
*버전: 1.0.0*
