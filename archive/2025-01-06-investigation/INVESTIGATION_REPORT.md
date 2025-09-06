# 포스트 에디터 문제 조사 보고서

## 조사 일시: 2025-01-06

## 문제 현상
- 포스트 편집 시 제목과 내용이 로드되지 않음
- URL에는 올바른 ID가 표시됨 (/editor/posts/{id})
- "Untitled Document"로 표시됨

## 조사 결과

### 1. 데이터 흐름
```
Posts.tsx → navigate(`/editor/posts/${id}`)
    ↓
StandaloneEditor.tsx → postApi.get(id)
    ↓
API Server → { status: 'success', data: {...} }
    ↓
postApi.ts → { success: true, data: response.data }
    ↓
StandaloneEditor → response.data.data || response.data
```

### 2. 발견된 코드 문제점

#### A. 중복된 if 문 (StandaloneEditor.tsx)
- 154-155줄: `if (import.meta.env.DEV)` 중복
- 163-164줄: 동일한 중복
- 불필요한 중첩으로 코드 복잡도 증가

#### B. 데이터 로딩 조건
```javascript
if (postId && !isNewPost && isWordPressReady) {
  loadPostData(postId);
}
```
- 세 조건 모두 충족해야 로딩
- isWordPressReady가 늦게 true가 되면 지연 발생

### 3. 의심되는 근본 원인

#### 가능성 1: React State 업데이트 문제
- setPostTitle 호출 후 리렌더링 안 됨
- React 18의 자동 배칭 문제일 가능성

#### 가능성 2: WordPress 초기화 타이밍
- ensureWordPressLoaded 비동기 처리
- 데이터 로딩 시점과 불일치

#### 가능성 3: loadPostData 함수 실행 문제
- useEffect dependency 변경 감지 실패
- loadPostData가 실제로 호출되지 않을 가능성

### 4. 검증 필요 사항

1. **loadPostData 실제 호출 여부**
   - console.log 대신 toast 메시지로 확인
   
2. **setPostTitle 후 state 변경 확인**
   - React DevTools로 확인 필요
   
3. **API 응답 데이터 구조**
   - 실제 응답과 파싱 로직 일치 여부

### 5. 해결 방안 (우선순위)

1. **즉시 수정 가능**
   - 중복 if 문 제거
   - loadPostData 함수에 더 명확한 에러 처리

2. **추가 조사 필요**
   - useEffect dependency 최적화
   - WordPress 초기화 로직 개선

3. **장기 개선**
   - 에디터 컴포넌트 전체 리팩토링
   - 상태 관리 로직 단순화