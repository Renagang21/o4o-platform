# 🧾 Task 07: 특정 역할만 접근 가능한 페이지 보호 기능

## 📌 목적

특정 페이지는 `yaksa`, `operator`, `administrator` 등 일부 역할만 접근할 수 있도록 제한하고,  
기타 사용자(`user`, `member` 등)가 접근 시 **메시지를 보여주고 이전 페이지 또는 홈으로 이동**하도록 구현합니다.

---

## ✅ 대상 페이지 예시

| 경로 | 허용 역할 |
|------|-----------|
| `/b2b/product-upload` | `yaksa`, `operator`, `administrator` |
| `/partner/dashboard` | `partner`, `operator`, `administrator` |
| `/admin/users` | `administrator` |

---

## ✅ 기능 구성

### 1. 보호 컴포넌트 설정 (`RoleProtectedRoute.tsx`)

```tsx
if (!user || !allowedRoles.some(role => user.roles.includes(role))) {
  alert('이 페이지는 약사 전용입니다. 이전 화면으로 돌아갑니다.');
  return <Navigate to={-1} replace />;
}
```

- `alert()` 또는 커스텀 컴포넌트로 메시지 제공 가능
- `-1`은 `navigate(-1)`로 직전 페이지로 이동

### 2. 메시지 UX 개선 (선택)

- Modal 또는 Toast로 메시지를 보여준 후 이동 처리
- UI 모듈 사용 가능 (`react-toastify`, `dialog`, `HeadlessUI` 등)

---

## ⚙️ 적용 방식

```tsx
<Route
  path="/b2b/product-upload"
  element={
    <RoleProtectedRoute allowedRoles={['yaksa', 'operator', 'administrator']}>
      <ProductUploadPage />
    </RoleProtectedRoute>
  }
/>
```

---

## 📁 위치 제안

- `RoleProtectedRoute.tsx`: 보호 로직 수정
- 각 라우트 설정 파일 (`App.tsx`, `routes.tsx` 등)

---

## 🧪 테스트 포인트

- `yaksa` 사용자는 접근 가능
- `user`, `member` 사용자는 접근 시 메시지 후 이동
- `administrator`는 항상 접근 가능

---

## 📎 관련 문서

- `task-06-login-redirect.md`: 공통 홈 리디렉션
- `o4o-role-definition-guideline.md`: 역할 체계 정의

