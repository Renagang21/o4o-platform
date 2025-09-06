# O4O Platform - 글 편집 데이터 로드 문제 해결 과정

## 🔴 문제 상황

**증상**: "글 → 모든 글" 메뉴에서 특정 글을 편집하려고 클릭하면:
- URL은 정상적으로 `/editor/posts/{id}` 형태로 변경됨
- 제목과 내용 데이터는 API에서 정상적으로 가져옴 (네트워크 탭에서 확인)
- **하지만 편집 화면에는 빈 화면(새 글 작성 화면)이 표시됨**

## 📅 문제 해결 시도 타임라인

### 1차 시도: React State 업데이트 문제 의심
**커밋**: `8e0ad2be` - "debug: Add comprehensive debugging for post load and save issues"
- **접근**: React state가 제대로 업데이트되지 않는다고 판단
- **시도한 방법**:
  - `window.__routeDebug`에 라우팅 정보 저장
  - `window.__apiResponse`에 API 응답 저장
  - `window.__extractionInfo`에 데이터 추출 과정 저장
- **결과**: 데이터는 정상적으로 받아오지만 화면에 반영되지 않음

### 2차 시도: State 초기화 문제 해결
**커밋**: `45502801` - "fix: Resolve post data loading issues with proper state updates"
- **접근**: 컴포넌트 마운트 시 state 초기화 로직 수정
- **시도한 방법**:
  - `useEffect` 의존성 배열 정리
  - state 업데이트 순서 조정
- **결과**: 여전히 문제 지속

### 3차 시도: DOM 직접 조작 (Workaround)
**커밋**: `bc70d5dd` - "fix: Workaround for React state update issue by using DOM value"
- **접근**: React state가 업데이트되지 않으면 DOM을 직접 조작
- **시도한 방법**:
  ```javascript
  // DOM에 직접 값 설정
  const inputElement = document.querySelector('input[type="text"]');
  if (inputElement) {
    inputElement.value = title;
  }
  ```
- **결과**: 제목은 표시되지만 근본적인 해결책이 아님

### 4차 시도: State Reset 전략
**커밋**: `af0e9f78` - "fix: Reset state when postId changes to ensure clean initialization"
- **접근**: postId가 변경될 때 state를 완전히 리셋
- **시도한 방법**:
  - `postId` 변경 감지하여 state 초기화
  - `isNewPost` 플래그로 새 글과 기존 글 구분
- **결과**: 부분적 개선

### 5차 시도: useEffect 의존성 문제
**커밋**: `fd0288ad` - "fix: Add loadPostData to useEffect dependency array"
- **접근**: `loadPostData` 함수가 useEffect 의존성에 누락
- **시도한 방법**:
  - `useCallback`으로 `loadPostData` 메모이제이션
  - useEffect 의존성 배열에 추가
- **결과**: ESLint 경고는 해결했지만 문제 지속

### 6차 시도: State 업데이트 추적
**커밋**: `137800ea` - "fix: Add additional state tracking to diagnose React update issues"
- **접근**: State 업데이트 과정을 세밀하게 추적
- **시도한 방법**:
  - 각 state 변경 시점 로깅
  - React DevTools로 컴포넌트 렌더링 추적
- **결과**: state는 변경되지만 화면 렌더링 안 됨

### 7차 시도: Key Prop 추가
**커밋**: `4babfd85` - "fix: Add key prop to input and enhance debugging"
- **접근**: React reconciliation 문제로 판단
- **시도한 방법**:
  - input 요소에 `key={postId}` 추가
  - 컴포넌트 강제 리렌더링
- **결과**: 미미한 개선

### 8차 시도: 강제 업데이트 (Force Update)
**커밋**: `41ba415a` - "fix: Force input value update when React rendering fails"
**커밋**: `5d426da6` - "debug: Add detailed force update decision logging"
- **접근**: React가 업데이트를 감지하지 못하면 강제로 업데이트
- **시도한 방법**:
  ```javascript
  // flushSync로 동기적 업데이트 강제
  import { flushSync } from 'react-dom';
  
  flushSync(() => {
    setPostTitle(title);
    setBlocks(parsedBlocks);
  });
  ```
- **결과**: 일부 케이스에서 작동하지만 불안정

### 9차 시도: Input Width 문제 해결
**커밋**: `77b0a766` - "fix: Fix input width issue preventing title visibility"
- **접근**: CSS 문제로 input이 보이지 않는 것으로 의심
- **시도한 방법**:
  - input width를 명시적으로 설정
  - flex 레이아웃 조정
- **결과**: UI는 개선되었지만 데이터 로드 문제는 지속

### 10차 시도: Inline Style 강제 적용
**커밋**: `1d823af8` - "fix: Force text color with inline style"
- **접근**: CSS 우선순위 문제로 텍스트가 보이지 않는다고 가정
- **시도한 방법**:
  - 인라인 스타일로 color 강제 지정
  - `!important` 플래그 사용
- **결과**: 스타일은 적용되었지만 데이터는 여전히 로드 안 됨

### 11차 시도: GutenbergBlockEditor Props 전달
**커밋**: `5e91e029` - "fix: Pass documentTitle prop to GutenbergBlockEditor"
- **접근**: 자식 컴포넌트에 props가 제대로 전달되지 않음
- **시도한 방법**:
  - `documentTitle` prop 명시적 전달
  - prop drilling 점검
- **결과**: 에디터 내부는 개선되었지만 제목 입력 필드는 여전히 문제

### 12차 시도: 디버그 코드 정리
**커밋**: `838e3d25` - "cleanup: Remove debug code and workarounds"
- **접근**: 복잡한 디버그 코드가 오히려 문제를 일으킴
- **시도한 방법**:
  - 불필요한 console.log 제거
  - window 객체 디버그 변수 정리
- **결과**: 코드는 깔끔해졌지만 문제 미해결

### 13차 시도: 데이터 로드 로직 전면 재작성
**커밋**: `7ee317c5` - "fix: Fix post editor not loading existing post data"
- **접근**: 데이터 로드 로직을 처음부터 다시 작성
- **시도한 방법**:
  - API 응답 구조 재분석
  - 중첩된 data 구조 처리 로직 개선
  - isNewPost 판단 로직 강화
- **결과**: 부분적 성공

### 14차 시도: Console 로그 추가 (현재)
**커밋**: `bf9093da` - "debug: Add console logs to track data loading issue"
- **접근**: 문제 발생 지점을 정확히 파악하기 위한 로깅
- **시도한 방법**:
  - 각 단계별 console.log 추가
  - 데이터 흐름 추적
- **현재 상태**: 디버깅 진행 중

## 🔍 핵심 발견 사항

### 1. API 응답 구조의 복잡성
```javascript
// API 서버가 반환하는 구조
{
  status: 'success',
  success: true,
  data: {
    status: 'success',  // 중복된 status
    data: {             // 실제 Post 데이터
      id: 1,
      title: '글 제목',
      content: '...'
    }
  }
}
```
→ **중첩된 data 구조로 인한 파싱 어려움**

### 2. React State 업데이트 타이밍
- State는 업데이트되지만 화면에 반영되지 않는 현상
- `flushSync` 사용해도 완벽하지 않음
- React 18의 자동 배칭(automatic batching) 영향 의심

### 3. 라우팅과 컴포넌트 생명주기
- `/editor/posts/new` → `/editor/posts/1` 전환 시 컴포넌트 재마운트 필요
- 하지만 React Router는 같은 컴포넌트로 인식하여 업데이트만 시도
- `key` prop 변경으로도 해결 안 됨

### 4. Input 요소의 Controlled vs Uncontrolled
- `value={postTitle}` 설정했지만 업데이트 안 됨
- DOM 직접 조작 시에만 작동
- React의 controlled component 동작 이상

## 🎯 현재 상황 (2025년 1월)

### 작동하는 부분
- ✅ API 호출 및 데이터 수신
- ✅ Console에서 데이터 확인 가능
- ✅ 새 글 작성 기능
- ✅ 저장 기능

### 작동하지 않는 부분
- ❌ 기존 글 편집 시 데이터 로드
- ❌ 제목 필드에 데이터 표시
- ❌ 에디터 블록에 콘텐츠 로드

## 🚨 주요 의심 지점

1. **StandaloneEditor.tsx:73-74**
   ```javascript
   const isNewPost = !postId && (location.pathname.endsWith('/new') || location.pathname.endsWith('/new/'));
   ```
   → isNewPost 판단 로직이 정확한가?

2. **StandaloneEditor.tsx:266-273**
   ```javascript
   if (postId && !isNewPost && mounted) {
     console.log('Loading post data for:', postId);
     await loadPostData(postId);
   }
   ```
   → 조건문이 제대로 작동하는가?

3. **StandaloneEditor.tsx:219-224**
   ```javascript
   flushSync(() => {
     setPostTitle(title);
     setBlocks(parsedBlocks);
     setIsDirty(false);
   });
   ```
   → flushSync가 실제로 동기 업데이트를 보장하는가?

## 💡 시도하지 않은 해결 방법들

1. **컴포넌트 완전 재마운트 강제**
   - URL 변경 시 다른 컴포넌트로 라우팅
   - 또는 `location.key`를 컴포넌트 key로 사용

2. **Redux/Zustand 같은 외부 상태 관리**
   - React 내부 state 대신 외부 store 사용
   - 컴포넌트 재렌더링 강제

3. **useImperativeHandle로 ref 노출**
   - 부모 컴포넌트에서 직접 데이터 주입

4. **React.memo 제거 또는 수정**
   - 메모이제이션이 업데이트를 막는지 확인

5. **서버 사이드 렌더링 (SSR)**
   - 초기 데이터를 서버에서 렌더링

## 📝 결론

2주 이상 다양한 방법을 시도했지만 근본적인 해결책을 찾지 못함. 
주요 원인은 다음 중 하나로 추정:

1. React 18의 렌더링 최적화가 예상과 다르게 동작
2. 라우팅 시스템과 컴포넌트 생명주기 불일치
3. 복잡한 중첩 API 응답 구조
4. TypeScript 타입과 실제 데이터 구조 불일치

**현재 상태**: 디버깅 로그를 통해 정확한 문제 지점 파악 중

---

*마지막 업데이트: 2025년 1월 6일*
*작성자: Claude (O4O Platform 개발 지원)*