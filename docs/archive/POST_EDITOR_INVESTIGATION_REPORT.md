# 📋 글 편집기 문제 조사 보고서

## 🔍 조사 결과 요약

### ✅ 확인된 주요 문제들

1. **새 글 저장 시 URL 리다이렉트로 인한 중복 생성 가능성**
2. **Slug 필드가 UI에 노출되지 않음**
3. **페이지 리로드로 인한 상태 초기화**

---

## 1️⃣ 새 글 생성 흐름 분석

### 현재 구현 (`StandaloneEditor.tsx:289-296`)
```javascript
// If it's a new post and we get an ID back, update the URL and reload
if (!postId && savedData?.id) {
  window.history.replaceState(null, '', `/editor/posts/${savedData.id}`);
  window.location.href = `/editor/posts/${savedData.id}`;  // ⚠️ 페이지 리로드!
  return;
}
```

### 🔴 문제점
- 새 글 저장 후 **전체 페이지를 리로드**함
- 리로드 시 컴포넌트가 재마운트되면서 **초기 상태로 리셋**
- 사용자가 빠르게 다시 저장하면 **새로운 POST 요청** 발생 가능

---

## 2️⃣ Slug 처리 분석

### Slug 생성 로직 (`StandaloneEditor.tsx:264`)
```javascript
slug: postSettings.slug || actualTitle.toLowerCase().replace(/\s+/g, '-'),
```

### Slug 초기값 (`StandaloneEditor.tsx:97`)
```javascript
const [postSettings, setPostSettings] = useState({
  // ...
  slug: '',  // 💡 항상 빈 문자열로 시작
  // ...
});
```

### Slug 로드 (`StandaloneEditor.tsx:165`)
```javascript
setPostSettings({
  // ...
  slug: data.slug || '',  // ✅ API에서 받은 slug 저장
  // ...
});
```

### 🔴 문제점
1. **Slug 입력 UI가 없음** - 사용자가 slug를 수정할 수 없음
2. **새 글의 경우** - 항상 제목 기반으로 자동 생성
3. **서버 측 중복 처리** - 같은 slug가 있으면 서버가 `-2`, `-3` 등을 붙임

---

## 3️⃣ 편집 시 데이터 바인딩

### ✅ 정상 동작 확인
- 기존 글 편집 시 `loadPostData`에서 slug를 정상적으로 로드함
- `postSettings.slug`에 저장됨
- 하지만 **UI에 표시되지 않아** 사용자가 확인/수정 불가

---

## 4️⃣ 업데이트 실패 가능성

### 현재 구현
```javascript
const response = postId 
  ? await postApi.update({ ...baseData, id: String(postId) })
  : await postApi.create(baseData);
```

### 🟡 잠재적 문제
- `postId`가 문자열로 제대로 전달되지 않으면 create로 처리됨
- 페이지 리로드 후 postId가 props로 전달되는 타이밍 이슈 가능

---

## 5️⃣ 자동저장 기능

### ✅ 조사 결과
- **자동저장 기능 없음** - 수동 저장만 구현됨
- 초안 자동 생성 기능 없음
- 중복 저장 방지: `isSaving` 플래그로 처리

---

## 📊 원인 분석 결론

### 🎯 핵심 원인: **페이지 리로드 방식**

1. **새 글 저장 시나리오**:
   - 사용자가 새 글 작성 → 저장 클릭
   - POST 요청으로 글 생성 (ID: 1)
   - `window.location.href`로 페이지 리로드
   - `/editor/posts/1`로 이동하지만 **컴포넌트 재마운트**
   - 사용자가 빠르게 다시 저장 클릭
   - `postId` props 전달 타이밍 문제로 **새 글로 인식**
   - 또 다른 POST 요청 발생 (ID: 2)

2. **Slug 중복 문제**:
   - 같은 제목으로 여러 번 저장 시
   - 클라이언트는 매번 같은 slug 전송 (예: `test-title`)
   - 서버가 중복 방지로 `-2`, `-3` 붙임

3. **편집 시 slug 수정 불가**:
   - UI에 slug 필드가 없어 사용자가 수정 불가능
   - SEO나 URL 관리가 어려움

---

## 🛠️ 권장 해결책

### 1. **즉시 수정 필요**
```javascript
// 페이지 리로드 대신 React Router 네비게이션 사용
if (!postId && savedData?.id) {
  // EditorRouteWrapper의 key 변경으로 재마운트 유도
  navigate(`/editor/posts/${savedData.id}`, { replace: true });
  setPostId(savedData.id);  // 상태 업데이트
  setIsDirty(false);
  return;
}
```

### 2. **Slug 관리 UI 추가**
- GutenbergSidebar에 slug 입력 필드 추가
- 실시간 slug 미리보기
- 중복 검사 기능

### 3. **상태 관리 개선**
- postId를 컴포넌트 state로 관리
- 저장 성공 후 create → update 모드 전환

### 4. **디버그 로그 추가**
```javascript
console.log('[Save] Mode:', postId ? 'UPDATE' : 'CREATE', { postId, slug: baseData.slug });
```

---

## 📋 수정 우선순위

1. **[긴급]** 페이지 리로드 제거 → React Router 네비게이션
2. **[높음]** Slug 입력 UI 추가
3. **[중간]** postId 상태 관리 개선
4. **[낮음]** 자동저장 기능 추가 (선택사항)

---

*조사일: 2025년 1월*
*조사자: Claude Code Assistant*