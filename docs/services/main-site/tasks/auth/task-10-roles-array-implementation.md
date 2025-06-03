# 🧾 Task 10: 사용자 역할을 복수 배열 형태로 전환한 적용 기록

## 📌 목적

기존에는 사용자 역할이 `role: UserRole` 형태로 단일 지정되었으나,  
이제는 `roles: UserRole[]` 배열을 사용하여 **복수 역할**을 가질 수 있도록 시스템이 전환되었습니다.

---

## ✅ 변경 내역 요약

### 1. 데이터 타입 변경

- `User.role: UserRole` → `User.roles: UserRole[]`
- 사용자 1명이 여러 역할을 가질 수 있음 (예: `['user', 'seller']`)

### 2. 역할 체크 방식 변경

- 기존: `user.role === 'administrator'`
- 변경: `user.roles.includes('administrator')`

### 3. 라우팅 보호 컴포넌트 변경

```tsx
if (!user || !allowedRoles.some(role => user.roles.includes(role))) {
  return <Navigate to="/" />;
}
```

### 4. 회원가입 및 관리자 UI 수정

- 기본 가입 시 역할 하나 선택 (예: 'user', 'contributor')
- 관리자 화면에서는 멀티셀렉트/체크박스 방식으로 복수 역할 지정 가능

---

## 🧱 적용 위치

- `AuthContext.tsx`
- `RoleProtectedRoute.tsx`
- `UserRoleManager.tsx`
- `Login.tsx`, `Register.tsx`
- `mockUsers`, `initialUsers`

---

## 📎 역할 목록 (2025 기준)

| 역할 ID | 설명 |
|---------|------|
| `user` | 게스트/소비자 |
| `member` | 가입 회원 |
| `contributor` | 콘텐츠 등록자 (예: 약사) |
| `seller` | 판매자 |
| `vendor` | 공급자 |
| `partner` | 제휴 파트너 |
| `operator` | 운영자 |
| `administrator` | 최고 관리자 |

---

## 🔄 적용 완료 상태

- 모든 보호 라우트, 권한 조건, UI 구성에 복수 역할 구조 적용됨
- 가입/관리자 지정/화면 분기 등 모두 `roles[]` 기준으로 동작

---

## ✨ 확장 고려

- 역할 기반 메뉴 구성 분기
- 각 역할별 콘텐츠 뷰/편집 권한 조합
- 역할 변경 이력 로그 등

