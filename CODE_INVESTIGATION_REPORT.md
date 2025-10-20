# 블록 편집기 코드 복잡도 조사 보고서

**작성일:** 2025-10-20
**조사 대상:** GutenbergBlockEditor.tsx 및 관련 블록 컴포넌트
**보고된 문제:**
1. 블록들에서 엔터키가 듣지 않음
2. 새로운 블록이 기존 작업 위치 위에 생김 (아래가 아니라)

---

## 1. 발견된 핵심 문제

### 🔴 문제 1: Stale Closure (오래된 클로저 참조)

**위치:** `GutenbergBlockEditor.tsx:628-645 (handleAddBlock)`

```typescript
const handleAddBlock = useCallback(
  (blockId: string, position: 'before' | 'after', blockType = 'o4o/paragraph', initialContent?: any) => {
    const index = blocks.findIndex((b) => b.id === blockId);  // ❌ blocks 직접 참조
    const newBlocks = [...blocks];  // ❌ blocks 직접 참조
    const insertIndex = position === 'after' ? index + 1 : index;
    newBlocks.splice(insertIndex, 0, newBlock);
    updateBlocks(newBlocks);
    setSelectedBlockId(newBlock.id);
  },
  [blocks, updateBlocks]  // ❌ blocks에 의존
);
```

**문제점:**
- `blocks` 상태를 직접 참조하고 있음
- `blocks`가 변경될 때마다 `handleAddBlock`이 재생성됨
- 하지만 **콜백이 캐싱되어 있어서** 오래된 `blocks`를 참조할 수 있음

**올바른 방법:**
```typescript
// blocksRef 사용 (이미 정의되어 있음 - line 1385)
const handleAddBlock = useCallback(
  (blockId: string, position: 'before' | 'after', blockType = 'o4o/paragraph', initialContent?: any) => {
    const index = blocksRef.current.findIndex((b) => b.id === blockId);  // ✅ blocksRef 사용
    const newBlocks = [...blocksRef.current];  // ✅ blocksRef 사용
    const insertIndex = position === 'after' ? index + 1 : index;
    newBlocks.splice(insertIndex, 0, newBlock);
    updateBlocks(newBlocks);
    setSelectedBlockId(newBlock.id);
  },
  [updateBlocks]  // ✅ blocks 의존성 제거
);
```

---

### 🔴 문제 2: 콜백 캐싱으로 인한 업데이트 누락

**위치:** `GutenbergBlockEditor.tsx:1488-1510 (getBlockCallbacks)`

```typescript
const getBlockCallbacks = useCallback((blockId: string) => {
  if (!callbacksMapRef.current.has(blockId)) {  // ❌ 이미 캐싱되면 새 콜백 안 만듦
    callbacksMapRef.current.set(blockId, {
      onAddBlock: createOnAddBlock(blockId),
      // ...
    });
  }
  return callbacksMapRef.current.get(blockId);  // ❌ 오래된 콜백 반환 가능
}, [createOnChange, createOnDelete, ..., createOnAddBlock, ...]);
```

**문제점:**
1. 한번 캐싱된 blockId는 `createOnAddBlock`이 변경되어도 새로운 콜백을 받지 못함
2. `blocks` 상태가 변경되면 block의 index가 바뀔 수 있는데, 캐싱된 콜백은 이전 상태를 참조
3. 클린업 로직 (line 1512-1522)은 삭제된 block만 정리하고, 기존 block의 콜백은 업데이트하지 않음

**결과:**
- Enter 키를 눌렀을 때 `onAddBlock('after', 'o4o/block-appender')`가 호출되지만
- 오래된 `blocks` 배열을 참조해서 잘못된 index 계산
- 블록이 엉뚱한 위치에 삽입됨

---

### 🔴 문제 3: blocksRef 미사용

**위치:** 여러 핸들러 함수들

**blocksRef를 사용하는 함수 (정상):**
- `createOnUpdate` (line 1482-1490) ✅
- `createOnInnerBlocksChange` (line 1492-1500) ✅

**blocksRef를 사용하지 않는 함수 (문제):**
- `handleBlockUpdate` (line 355-369) ❌
- `handleBlockDelete` (line 372-380) ❌
- `handleAddBlock` (line 628-645) ❌
- `handleDuplicate` (line 986-1000) ❌
- `handleMoveUp` (line 1003-1017) ❌
- `handleMoveDown` (line 1020-1034) ❌
- `handleBlockTypeChange` (line 1063-1092) ❌

**왜 문제인가:**
- `blocksRef.current`는 항상 최신 blocks를 가리킴
- `blocks` 직접 참조는 클로저에 캡처된 오래된 값일 수 있음
- 콜백 캐싱과 결합되면 더 심각한 stale closure 문제 발생

---

## 2. 코드 복잡도 분석

### 복잡도 요인

1. **Callback Factory Pattern + Caching**
   - 각 block마다 고유한 콜백 세트 생성
   - `callbacksMapRef`로 캐싱하여 성능 최적화
   - 하지만 캐시 무효화 로직이 불완전함

2. **긴 파일 길이**
   - GutenbergBlockEditor.tsx: **1500+ 라인**
   - 너무 많은 책임을 한 컴포넌트가 가지고 있음

3. **복잡한 의존성 체인**
   ```
   GutenbergBlockEditor
     → createOnAddBlock(blockId)
       → handleAddBlock(blockId, position, type)
         → blocks.findIndex(...)  ❌ stale closure!
   ```

4. **State와 Ref의 혼용**
   - `blocks` (state) ↔ `blocksRef` (ref)
   - 일부는 ref 사용, 일부는 state 사용
   - 일관성 없음

---

## 3. 실제 동작 시나리오 (문제 재현)

### 시나리오: Paragraph 블록에서 Enter 키

1. **초기 상태:**
   ```javascript
   blocks = [
     { id: 'block-1', type: 'paragraph' },  // index 0
     { id: 'block-2', type: 'paragraph' },  // index 1
   ]
   ```

2. **사용자가 block-1에서 Enter 키 입력**
   - ParagraphBlock의 `handleEnterKey` 호출
   - `onAddBlock('after', 'o4o/block-appender')` 호출

3. **onAddBlock 콜백 실행:**
   - 캐싱된 콜백이 실행됨
   - 콜백 내부의 `handleAddBlock`은 **오래된 blocks 배열**을 참조
   - `blocks.findIndex(b => b.id === 'block-1')` → index 0
   - `insertIndex = 0 + 1 = 1`
   - 새 블록을 index 1에 삽입

4. **하지만 실제 blocks 상태는 이미 변경되었을 수 있음:**
   ```javascript
   blocks = [
     { id: 'block-3', type: 'heading' },   // index 0 (새로 추가됨)
     { id: 'block-1', type: 'paragraph' }, // index 1 (이동됨)
     { id: 'block-2', type: 'paragraph' }, // index 2
   ]
   ```

5. **결과:**
   - 오래된 index로 계산하여 잘못된 위치에 삽입
   - 사용자가 기대한 위치와 다른 곳에 블록 생성

---

## 4. Enter 키가 작동하지 않는 이유

### 검증 결과

✅ **Enter 핸들러 자체는 정상:**
- `createBlockEnterHandler` (handleBlockEnter.ts) - 올바르게 구현됨
- ParagraphBlock: `handleEnterKey` 사용 중
- HeadingBlock: `handleEnterKey` 사용 중
- BlockAppenderBlock: 독립적인 Enter 핸들러 사용 중

❌ **문제는 콜백 전달 과정:**
- `onAddBlock` prop이 제대로 전달됨
- 하지만 **실행 시점의 blocks 상태가 오래됨**
- 콜백이 캐싱되어 있어서 최신 상태를 참조하지 못함

---

## 5. 블록이 위에 생기는 이유

### insertIndex 계산 로직 (line 639)

```typescript
const insertIndex = position === 'after' ? index + 1 : index;
```

**로직 자체는 올바름:**
- `position === 'after'` → `index + 1` (아래에 삽입)
- `position === 'before'` → `index` (위에 삽입)

**문제:**
- `index`가 **오래된 blocks 배열**에서 계산됨
- 실제 현재 blocks 배열의 index와 다를 수 있음
- 예:
  - 오래된 blocks: `block-1`이 index 0
  - 현재 blocks: `block-1`이 index 2
  - `insertIndex = 0 + 1 = 1` 계산
  - 하지만 실제로는 index 3에 삽입되어야 함
  - 결과: 블록이 의도하지 않은 위치 (위쪽)에 생김

---

## 6. 해결 방안 (사용자와 논의 필요)

### 방안 A: blocksRef 일관 사용 (빠른 수정)

**장점:**
- 빠르게 적용 가능
- 최소한의 코드 변경

**단점:**
- 근본적인 복잡도 해결 안 됨
- 여전히 코드가 복잡함

**변경 필요:**
```typescript
// 모든 핸들러에서 blocks → blocksRef.current로 변경
const handleAddBlock = useCallback(
  (blockId: string, position: 'before' | 'after', blockType = 'o4o/paragraph', initialContent?: any) => {
    const index = blocksRef.current.findIndex((b) => b.id === blockId);
    const newBlocks = [...blocksRef.current];
    // ...
  },
  [updateBlocks]  // blocks 의존성 제거
);

// 총 7개 핸들러 수정 필요
```

---

### 방안 B: 콜백 캐시 제거 (중간 수정)

**장점:**
- Stale closure 문제 완전 제거
- 항상 최신 콜백 사용

**단점:**
- 성능 영향 (매 렌더마다 콜백 재생성)
- 불필요한 리렌더 발생 가능

**변경 필요:**
```typescript
// callbacksMapRef 제거
// getBlockCallbacks를 단순 콜백 생성 함수로 변경
const getBlockCallbacks = useCallback((blockId: string) => {
  return {
    onChange: createOnChange(blockId),
    onDelete: createOnDelete(blockId),
    // ... (매번 새로 생성)
  };
}, [createOnChange, createOnDelete, ...]);
```

---

### 방안 C: 컴포넌트 분리 및 리팩토링 (근본적 해결)

**장점:**
- 복잡도 근본적으로 해결
- 유지보수성 대폭 향상
- 테스트 가능성 향상

**단점:**
- 대규모 리팩토링 필요
- 시간 소요 큼
- 버그 발생 리스크

**제안 구조:**
```
GutenbergBlockEditor (700줄)
  → useBlockManager 훅 (200줄)
    - 블록 CRUD 로직
    - 콜백 관리
  → useBlockSelection 훅 (100줄)
    - 선택 상태 관리
  → useBlockDragDrop 훅 (100줄)
    - 드래그 앤 드롭 로직
  → useEditorHistory 훅 (100줄)
    - Undo/Redo 관리
  → EditorCanvas 컴포넌트 (200줄)
    - 실제 편집 UI
```

---

## 7. 권장 사항

### 즉시 적용 (방안 A):
1. 모든 핸들러에서 `blocks` → `blocksRef.current` 변경
2. 의존성 배열에서 `blocks` 제거
3. 간단한 테스트로 검증

### 중기 계획 (방안 C):
1. Custom hooks로 로직 분리
2. 파일 분할 (각 700줄 이하)
3. 단위 테스트 작성

---

## 8. 테스트 계획

### 수정 후 검증 항목:

1. **Enter 키 동작:**
   - [ ] Paragraph 블록에서 Enter → 새 BlockAppender가 **아래에** 생성됨
   - [ ] Heading 블록에서 Enter → 새 BlockAppender가 **아래에** 생성됨
   - [ ] BlockAppender에서 Enter (내용 있음) → Paragraph로 변환 + 새 BlockAppender가 **아래에** 생성됨
   - [ ] BlockAppender에서 Enter (내용 없음) → 새 BlockAppender가 **아래에** 생성됨

2. **블록 삽입 위치:**
   - [ ] 여러 블록 추가 후 중간 블록에서 Enter → 올바른 위치에 삽입
   - [ ] 블록 이동 후 Enter → 올바른 위치에 삽입
   - [ ] 블록 삭제 후 Enter → 올바른 위치에 삽입

3. **Slash 명령:**
   - [ ] BlockAppender에서 "/" 입력 → 제자리 교체
   - [ ] Paragraph에서 "/" 입력 → 새 블록 추가

---

## 결론

**핵심 문제:**
- Stale closure (오래된 blocks 참조)
- 콜백 캐싱으로 인한 업데이트 누락
- blocksRef 미사용

**해결 난이도:**
- 빠른 수정 (방안 A): 2-3시간
- 근본적 해결 (방안 C): 2-3일

**권장:**
1. 먼저 방안 A로 즉시 수정
2. 이후 방안 C로 점진적 리팩토링
