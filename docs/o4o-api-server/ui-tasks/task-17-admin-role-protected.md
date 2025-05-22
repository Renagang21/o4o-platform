# Task: 관리자 역할 기반 라우팅 보호 적용

## 🎯 목적
관리자 계정에 설정된 역할(Role)에 따라 접근 가능한 기능/화면을 제한하여, 권한이 없는 관리자 계정이 중요한 관리 기능에 접근하지 못하도록 보호한다.

---

## ✅ 구현할 기능

### 1. 역할 기반 보호 라우트 컴포넌트 생성 (`AdminRoleProtectedRoute`)
- 사용자의 역할이 지정된 역할 이상인지 확인
- 조건 불충족 시 접근 거부 또는 `/admin`으로 리디렉션
- 최소 권한 설정 방식:
```tsx
<AdminRoleProtectedRoute role="superadmin">
  <AdminUserList />
</AdminRoleProtectedRoute>
```

### 2. 기존 관리자 페이지 적용
- `/admin/users*`: `superadmin`만 접근 가능
- `/admin/orders`, `/admin/products`: `manager` 이상 접근 가능
- `viewer`: 읽기 전용 접근 (또는 차후 별도 처리)

### 3. 네비게이션 표시 조건 분기
- 현재 로그인한 관리자 역할에 따라 메뉴 노출 여부 제어
- 예: `superadmin`만 "관리자 계정 관리" 메뉴 표시

---

## 🔐 역할 권한 정의 (예시)
| 역할        | 설명                           |
|-------------|--------------------------------|
| superadmin  | 모든 관리자 페이지 접근 가능   |
| manager     | 상품/주문 페이지만 접근 가능   |
| viewer      | 읽기 전용 접근 (추후 구현)     |

---

## 🧩 기술 스택
- React + Context (`AdminUserContext`)
- ProtectedRoute → 역할 조건 추가 확장

---

## 🧪 테스트 조건
- `superadmin`만 관리자 계정 관리 페이지 접근 가능
- `manager`는 주문/상품 관리 가능, 계정 관리 접근 시 리디렉션
- 역할 변경 후 동작 반영 확인

---

## 📌 확장 계획
- `viewer` 전용 UI 제한 (읽기 전용 컴포넌트 구성)
- 접근 거부 시 사용자 메시지 또는 403 페이지 제공
- 서버 연동 시 역할 기반 API 응답 제한 처리

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-17-admin-role-protected.md`