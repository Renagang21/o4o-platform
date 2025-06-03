# 🧾 Task 11: 403 Forbidden 페이지 구성

## 📌 목적

접근 권한이 없는 사용자가 보호된 페이지에 접근할 경우  
`403 Forbidden` 페이지로 리디렉션되도록 구성하여 UX와 보안 측면 모두를 강화합니다.

---

## ✅ 기능 구성

### 1. `/403` 페이지 생성

```tsx
// src/pages/Forbidden.tsx
export default function Forbidden() {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1>403 Forbidden</h1>
      <p>이 페이지에 접근할 권한이 없습니다.</p>
    </div>
  );
}
```

- 간결한 메시지와 SEO 대응용 `<h1>` 포함

---

### 2. 라우터에 등록

```tsx
// App.tsx 또는 routes.tsx
import Forbidden from './pages/Forbidden';

<Route path="/403" element={<Forbidden />} />
```

---

### 3. RoleProtectedPage.tsx에서 적용

```tsx
// 접근 불가 시
toast.error(message);
return <Navigate to="/403" replace />;
```

- 기존: `Navigate to="/"` → 수정: `Navigate to="/403"`

---

## 🧪 테스트 조건

- user가 `yaksa 전용 페이지` 접근 시 `/403` 이동
- 로그인하지 않은 사용자가 보호 페이지 접근 시 `/403` 이동
- 관리자는 접근 차단 없음

---

## ✅ 확장 고려

- 향후 404, 401, 500 등 에러 페이지도 `/errors/:code` 구조로 통합 가능
- toast 외에 `모달`, `shadcn/ui`, `emotion` 등으로 UX 개선 가능

---

## 📎 참고 문서

- `task-07-role-page-guard.md`
- `task-08-editor-role-integration.md`
- `task-10-roles-array-implementation.md`
