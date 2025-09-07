# 📋 React Router 네비게이션 전환 조사 보고서

## 🔍 조사 요약

### 시도한 변경
페이지 리로드(`window.location.href`) 대신 React Router 네비게이션(`navigate()`)으로 전환 시도

### 발생한 문제
`setPostId is not defined` 에러 - StandaloneEditor 컴포넌트에서 postId를 state로 관리하지 않음

---

## 🏗️ 현재 아키텍처 분석

### 1. postId 관리 구조
```
EditorRouteWrapper (부모)
  ├── postId를 URL에서 추출
  └── props로 StandaloneEditor에 전달
  
StandaloneEditor (자식)
  ├── postId를 props로 받음 (state 아님!)
  └── 새 글 저장 후 페이지 리로드로 처리
```

### 2. 왜 setPostId가 없는가?
- **설계 의도**: postId는 URL이 single source of truth
- **props 전달**: EditorRouteWrapper가 URL에서 추출하여 전달
- **state 불필요**: URL 변경 시 컴포넌트가 재마운트되므로

---

## 🔴 React Router 전환의 문제점

### 1. State 관리 충돌
```javascript
// 시도한 코드
navigate(`/editor/${mode}s/${savedData.id}`, { replace: true });
setPostId(savedData.id);  // ❌ setPostId가 존재하지 않음!
```

### 2. 필요한 추가 작업
- StandaloneEditor에 `useState`로 postId 관리 추가
- props postId와 local state postId 동기화
- EditorRouteWrapper의 key 로직 수정

### 3. 복잡도 증가
```javascript
// 필요한 변경사항
const [localPostId, setLocalPostId] = useState(postId);

useEffect(() => {
  setLocalPostId(postId);
}, [postId]);

// 저장 시
if (!localPostId && savedData?.id) {
  navigate(`/editor/${mode}s/${savedData.id}`, { replace: true });
  setLocalPostId(savedData.id);
}
```

---

## 📊 두 방식 비교

### 페이지 리로드 방식 (현재)
**장점:**
- 단순하고 명확한 상태 초기화
- URL과 컴포넌트 상태 100% 동기화
- 추가 state 관리 불필요

**단점:**
- 사용자 경험 저하 (화면 깜빡임)
- 네트워크 리소스 재다운로드
- 잠재적 중복 저장 위험

### React Router 방식 (제안)
**장점:**
- 부드러운 전환 (SPA 장점)
- 리소스 효율적
- 중복 저장 방지

**단점:**
- 복잡한 state 관리 필요
- props와 state 동기화 이슈
- 코드 복잡도 증가

---

## 🎯 권장 해결책

### Option 1: 최소 변경 (즉시 적용 가능)
```javascript
// StandaloneEditor.tsx에서
const [internalPostId, setInternalPostId] = useState<string | number | undefined>(postId);

useEffect(() => {
  setInternalPostId(postId);
}, [postId]);

// 저장 후
if (!internalPostId && savedData?.id) {
  navigate(`/editor/${mode}s/${savedData.id}`, { replace: true });
  setInternalPostId(savedData.id);
  setIsDirty(false);
}
```

### Option 2: 구조 개선 (권장)
```javascript
// EditorRouteWrapper에서 postId state 관리
const EditorRouteWrapper = () => {
  const [postId, setPostId] = useState(id || 'new');
  
  // postId setter도 props로 전달
  return (
    <StandaloneEditor
      mode={mode}
      postId={postId}
      setPostId={setPostId}
    />
  );
};
```

### Option 3: Context API 활용
```javascript
// EditorContext 생성
const EditorContext = createContext({
  postId: null,
  setPostId: () => {},
});

// 전역 상태 관리로 해결
```

---

## ⚠️ 주의사항

### 1. 현재 코드가 작동하는 이유
- 페이지 리로드로 모든 상태가 초기화
- URL에서 새로운 postId를 읽어옴
- 컴포넌트가 완전히 재마운트

### 2. React Router 전환 시 필요한 검증
- [ ] postId state 추가 후 props와 동기화
- [ ] navigate 후 컴포넌트 재렌더링 확인
- [ ] loadPostData 재호출 여부 확인
- [ ] 중복 저장 방지 테스트

---

## 📝 결론

### 현재 상황
- `setPostId` 함수가 없어서 React Router 전환 실패
- postId는 props로만 관리되고 있음

### 선택지
1. **유지**: 현재 페이지 리로드 방식 유지 (간단하지만 UX 저하)
2. **개선**: State 추가하여 React Router 전환 (복잡하지만 UX 향상)
3. **리팩토링**: 전체 구조 개선 (시간 소요 많음)

### 추천
**Option 1 (최소 변경)** 먼저 적용하여 테스트 후, 
안정화되면 **Option 2 (구조 개선)**으로 진행

---

*조사일: 2025년 1월*
*조사자: Claude Code Assistant*