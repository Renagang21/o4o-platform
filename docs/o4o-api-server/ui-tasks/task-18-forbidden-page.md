# Task: 403 Forbidden 페이지 구성 및 역할 미달 접근 처리

## 🎯 목적
역할(Role) 기반 보호 라우트에서 권한이 없는 사용자가 관리자 페이지에 접근할 경우, 명확한 UX를 제공하기 위해 403 Forbidden 전용 페이지를 구성한다.

---

## ✅ 구현할 기능

### 1. ForbiddenPage 컴포넌트 생성
- 메시지: "이 페이지에 접근할 수 있는 권한이 없습니다."
- 스타일: 관리자 UI에 맞는 Tailwind 기반 디자인
- 버튼: 홈(`/admin`) 또는 로그인(`/admin/login`)으로 이동

### 2. AdminRoleProtectedRoute 통합
- 조건 미달(`role !== superadmin` 등)일 때 `<ForbiddenPage />` 렌더링
```tsx
if (!hasRequiredRole) return <ForbiddenPage />;
```

### 3. App.tsx 적용 예시
- `/admin/users*` 경로에서 manager/viewer가 접근 시 403 페이지로 이동
- 추후 일반 사용자나 seller/supplier도 역할 기반 보호 시 사용 가능

---

## 🧩 기술 스택
- React + TailwindCSS
- 라우팅 구성: `react-router-dom`
- 인증 및 역할: `AdminAuthContext`, `AdminUserContext`

---

## 🧪 테스트 조건
- 관리자 로그인 상태에서 권한이 없는 경로 접근 시 403 페이지 렌더링
- "홈으로" 또는 "로그인" 버튼 정상 작동
- 역할 변경 후 접근 시 반응 확인

---

## 📌 확장 계획
- 사용자 전용 403 페이지 별도 구성 (예: `/cart` 접근 제한 시)
- 404 Not Found 페이지와 통합된 오류 시스템 구성
- 모든 보호 라우트에서 fallback 403 페이지 사용 가능

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-18-forbidden-page.md`