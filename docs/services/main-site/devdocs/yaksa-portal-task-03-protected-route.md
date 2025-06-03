
# 🧾 Task 03: ProtectedRoute 및 역할 기반 라우트 가드 구현

## 🎯 목적
yaksa.site에서 인증된 사용자만 특정 페이지에 접근하거나, 역할에 따라 접근 제어를 적용할 수 있도록 보호 라우트 구조를 구현한다.

---

## ✅ 작업 위치

- 인증 보호 컴포넌트: `src/components/ProtectedRoute.tsx`
- 역할 기반 보호 컴포넌트: `src/components/RoleProtectedRoute.tsx`
- 인증 상태 관리: `src/store/authStore.ts`

---

## 🔐 기본 기능 구현

### 1. `ProtectedRoute`
- 로그인 여부에 따라 children 또는 `/login`으로 리디렉션
- localStorage 또는 authStore 기준으로 인증 여부 판단

### 2. `RoleProtectedRoute`
- `roles` prop으로 허용된 역할 배열 지정
- 로그인 + 허용 역할 포함 → 접근 허용
- 그렇지 않으면 `/403` 또는 fallback 메시지 출력

---

## ✅ 사용 예시

```tsx
<ProtectedRoute>
  <MyPage />
</ProtectedRoute>

<RoleProtectedRoute roles={['admin', 'superadmin']}>
  <AdminDashboard />
</RoleProtectedRoute>
```

---

## 📋 상태 구조 예시 (authStore)

```ts
{
  token: string;
  role: 'b2c' | 'yaksa' | 'admin' | 'superadmin';
  isAuthenticated: boolean;
}
```

---

## 💡 참고 사항

- 로그인 후 상태는 이미 mock 또는 토큰 저장으로 처리 가능
- 라우트 보호는 SPA 구조 기준 (React Router `Outlet`, `useLocation()` 활용)

---

## 📎 참고 문서

- `docs/yaksa-site/wireframes/08-role-permissions.md`
- `docs/yaksa-site/wireframes/07-common-ui-and-menu-structure.md`
