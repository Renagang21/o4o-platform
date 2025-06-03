# 🧾 Task 09: 회원 역할 변경 기능 (관리자용)

## 📌 목적

관리자가 회원의 역할(roles)을 **복수로 수정/부여/회수**할 수 있는 기능을 제공합니다.

---

## ✅ 핵심 기능

- **역할은 배열로 저장됨 (`roles: UserRole[]`)**
- **UI는 체크박스 기반 멀티 선택**
- 역할 변경 후 저장 시 서버에 `PUT /api/users/:id` 등으로 전송
- 변경 이력은 로그로 저장 가능 (task-13에서 확장)

---

## 🧱 UI 구성 (예시)

```tsx
// src/pages/admin/UserRoleManager.tsx
const ALL_ROLES: UserRole[] = [
  'user', 'member', 'contributor', 'seller',
  'vendor', 'partner', 'operator', 'administrator',
];
```

- 사용자 목록이 테이블 형식으로 나열됨
- 각 행마다 역할을 편집할 수 있는 체크박스 열 포함
- "저장" 버튼 클릭 시 전체 수정된 사용자 roles를 서버에 반영

---

## 💾 저장 구조

### 프론트

```ts
// roles 변경 시
await fetch(`/api/users/${user.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ roles: updatedRoles }),
});
```

### 백엔드 예시

```ts
PUT /api/users/:id
{
  "roles": ["user", "partner"]
}
```

---

## 🔒 보호 조건

- 이 화면은 `administrator`, `operator`만 접근 가능
- `RoleProtectedRoute`로 감쌈:

```tsx
<RoleProtectedRoute allowedRoles={['administrator', 'operator']}>
  <UserRoleManager />
</RoleProtectedRoute>
```

---

## 🧪 테스트 조건

- 여러 사용자 선택 후 roles 수정 가능
- `user.roles.includes(...)`로 라우트 접근 확인
- 관리자 아닌 사용자는 이 화면에 접근 불가

---

## 📎 참고 문서

- `task-10-roles-array-implementation.md`
- `task-07-role-page-guard.md`
